import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { createTestApp } from '../test-utils/supertest-app';
import { mockJwtAuthenticationGuard } from '../test-utils/mock-jwt-auth-guard';

describe('The UsersController', () => {
  let app: INestApplication;

  let userUpdateMock: jest.Mock;

  let transactionUserFindUniqueMock: jest.Mock;
  let transactionUserDeleteMock: jest.Mock;
  let transactionArticleDeleteManyMock: jest.Mock;
  let transactionArticleUpdateManyMock: jest.Mock;
  let transactionMock: jest.Mock;

  beforeEach(async () => {
    userUpdateMock = jest.fn();

    transactionUserFindUniqueMock = jest.fn();
    transactionUserDeleteMock = jest.fn();
    transactionArticleDeleteManyMock = jest.fn();
    transactionArticleUpdateManyMock = jest.fn();

    const transactionClient = {
      user: {
        findUnique: transactionUserFindUniqueMock,
        delete: transactionUserDeleteMock,
      },
      article: {
        deleteMany: transactionArticleDeleteManyMock,
        updateMany: transactionArticleUpdateManyMock,
      },
    };

    transactionMock = jest.fn(async (callback: (client: any) => any) => {
      return await callback(transactionClient);
    });

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              update: userUpdateMock,
            },
            $transaction: transactionMock,
          },
        },
      ],
      controllers: [UsersController],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue({
        ...mockJwtAuthenticationGuard,
        canActivate: (context: ExecutionContext) =>
          mockJwtAuthenticationGuard.canActivate(context),
      })
      .compile();

    app = await createTestApp(module);
  });

  describe('when the PATCH /users/phone-number endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .patch('/users/phone-number')
          .send({})
          .expect(400);
      });
    });

    describe('and the correct data is provided', () => {
      beforeEach(() => {
        userUpdateMock.mockResolvedValue({
          id: 1,
          phoneNumber: '+1234567890',
        });
      });

      it('should respond with the updated user', () => {
        return request(app.getHttpServer())
          .patch('/users/phone-number')
          .send({ phoneNumber: '+1234567890' })
          .expect(200)
          .expect({
            id: 1,
            phoneNumber: '+1234567890',
          });
      });
    });
  });

  describe('when the DELETE /users endpoint is called', () => {
    describe('and newAuthor is not provided', () => {
      beforeEach(() => {
        transactionUserFindUniqueMock.mockResolvedValue({ id: 1 });
        transactionArticleDeleteManyMock.mockResolvedValue({ count: 2 });
        transactionUserDeleteMock.mockResolvedValue({ id: 1 });
      });

      it('should delete the current user and their articles', () => {
        return request(app.getHttpServer()).delete('/users').expect(200).expect({
          message: 'User 1 deleted successfully. 2 article(s) deleted',
          deletedArticles: 2,
        });
      });
    });

    describe('and newAuthor is provided', () => {
      beforeEach(() => {
        transactionUserFindUniqueMock.mockResolvedValueOnce({ id: 1 });
        transactionUserFindUniqueMock.mockResolvedValueOnce({ id: 2 });
        transactionArticleUpdateManyMock.mockResolvedValue({ count: 3 });
        transactionUserDeleteMock.mockResolvedValue({ id: 1 });
      });

      it('should delete the current user and reassign their articles', () => {
        return request(app.getHttpServer())
          .delete('/users')
          .query({ newAuthor: '2' })
          .expect(200)
          .expect({
            message:
              'User 1 deleted successfully. 3 article(s) reassigned to author 2',
            reassignedArticles: 3,
          });
      });
    });
  });
});



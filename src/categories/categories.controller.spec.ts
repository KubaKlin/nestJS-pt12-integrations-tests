import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../database/prisma.service';
import CategoriesController from './categories.controller';
import { CategoriesService } from './categories.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { createTestApp } from '../test-utils/supertest-app';
import { mockJwtAuthenticationGuard } from '../test-utils/mock-jwt-auth-guard';

describe('The CategoriesController', () => {
  let app: INestApplication;

  let findManyMock: jest.Mock;
  let findUniqueMock: jest.Mock;
  let createMock: jest.Mock;
  let updateMock: jest.Mock;
  let deleteMock: jest.Mock;

  beforeEach(async () => {
    findManyMock = jest.fn();
    findUniqueMock = jest.fn();
    createMock = jest.fn();
    updateMock = jest.fn();
    deleteMock = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: {
            category: {
              findMany: findManyMock,
              findUnique: findUniqueMock,
              create: createMock,
              update: updateMock,
              delete: deleteMock,
            },
          },
        },
      ],
      controllers: [CategoriesController],
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

  describe('when the GET /categories endpoint is called', () => {
    beforeEach(() => {
      findManyMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    });

    it('should respond with the categories', () => {
      return request(app.getHttpServer()).get('/categories').expect(200).expect([
        { id: 1 },
        { id: 2 },
      ]);
    });
  });

  describe('when the GET /categories/:id endpoint is called', () => {
    describe('and the category exists', () => {
      beforeEach(() => {
        findUniqueMock.mockResolvedValue({ id: 1, name: 'Science', articles: [] });
      });

      it('should respond with the category', () => {
        return request(app.getHttpServer())
          .get('/categories/1')
          .expect(200)
          .expect({ id: 1, name: 'Science', articles: [] });
      });
    });

    describe('and the category does not exist', () => {
      beforeEach(() => {
        findUniqueMock.mockResolvedValue(undefined);
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer()).get('/categories/999').expect(404);
      });
    });
  });

  describe('when the POST /categories endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer()).post('/categories').send({}).expect(400);
      });
    });

    describe('and the correct data is provided', () => {
      beforeEach(() => {
        createMock.mockResolvedValue({ id: 2, name: 'New category' });
      });

      it('should respond with the new category', () => {
        return request(app.getHttpServer())
          .post('/categories')
          .send({ name: 'New category' })
          .expect(201)
          .expect({ id: 2, name: 'New category' });
      });
    });
  });

  describe('when the PATCH /categories/:id endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .patch('/categories/1')
          .send({ name: '' })
          .expect(400);
      });
    });

    describe('and the correct data is provided', () => {
      beforeEach(() => {
        updateMock.mockResolvedValue({ id: 1, name: 'Updated' });
      });

      it('should respond with the updated category', () => {
        return request(app.getHttpServer())
          .patch('/categories/1')
          .send({ name: 'Updated' })
          .expect(200)
          .expect({ id: 1, name: 'Updated' });
      });
    });
  });
});



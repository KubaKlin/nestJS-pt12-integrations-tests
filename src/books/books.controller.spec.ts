import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../database/prisma.service';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { createTestApp } from '../test-utils/supertest-app';
import { mockJwtAuthenticationGuard } from '../test-utils/mock-jwt-auth-guard';

describe('The BooksController', () => {
  let app: INestApplication;

  let bookCreateMock: jest.Mock;
  let bookFindManyMock: jest.Mock;
  let bookFindUniqueMock: jest.Mock;
  let bookUpdateMock: jest.Mock;
  let bookDeleteMock: jest.Mock;

  beforeEach(async () => {
    bookCreateMock = jest.fn();
    bookFindManyMock = jest.fn();
    bookFindUniqueMock = jest.fn();
    bookUpdateMock = jest.fn();
    bookDeleteMock = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: PrismaService,
          useValue: {
            book: {
              create: bookCreateMock,
              findMany: bookFindManyMock,
              findUnique: bookFindUniqueMock,
              update: bookUpdateMock,
              delete: bookDeleteMock,
            },
          },
        },
      ],
      controllers: [BooksController],
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

  describe('when the GET /books endpoint is called', () => {
    beforeEach(() => {
      bookFindManyMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    });

    it('should respond with the books', () => {
      return request(app.getHttpServer()).get('/books').expect(200).expect([
        { id: 1 },
        { id: 2 },
      ]);
    });
  });

  describe('when the POST /books endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer()).post('/books').send({}).expect(400);
      });
    });

    describe('and the correct data is provided', () => {
      beforeEach(() => {
        bookCreateMock.mockResolvedValue({
          id: 10,
          title: 'New book',
          description: null,
          authors: [],
        });
      });

      it('should respond with the new book', () => {
        return request(app.getHttpServer())
          .post('/books')
          .send({ title: 'New book' })
          .expect(201)
          .expect({
            id: 10,
            title: 'New book',
            description: null,
            authors: [],
          });
      });
    });
  });

  describe('when the PATCH /books/:id endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .patch('/books/1')
          .send({ authorIds: 'not-an-array' })
          .expect(400);
      });
    });

    describe('and the correct data is provided', () => {
      beforeEach(() => {
        bookUpdateMock.mockResolvedValue({
          id: 1,
          title: 'Updated title',
          description: null,
          authors: [],
        });
      });

      it('should respond with the updated book', () => {
        return request(app.getHttpServer())
          .patch('/books/1')
          .send({ title: 'Updated title' })
          .expect(200)
          .expect({
            id: 1,
            title: 'Updated title',
            description: null,
            authors: [],
          });
      });
    });
  });
});



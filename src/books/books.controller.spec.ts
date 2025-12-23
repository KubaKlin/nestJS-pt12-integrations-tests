import { ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../database/prisma.service';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { createTestApp } from '../test-utils/supertest-app';
import { mockJwtAuthenticationGuard } from '../test-utils/mock-jwt-auth-guard';
import { Prisma } from '../../generated/prisma';
import { PrismaError } from '../database/prisma-error.enum';

describe('The BooksController', () => {
  let app: INestApplication;

  let bookCreateMock: jest.Mock;
  let bookFindManyMock: jest.Mock;
  let bookFindUniqueMock: jest.Mock;
  let bookUpdateMock: jest.Mock;
  let bookDeleteMock: jest.Mock;

  const createKnownRequestError = (code: string) => {
    return new Prisma.PrismaClientKnownRequestError('Known Prisma error', {
      code,
      clientVersion: 'test',
    } as any);
  };

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

  describe('when the GET /books/:id endpoint is called', () => {
    describe('and the book exists', () => {
      beforeEach(() => {
        bookFindUniqueMock.mockResolvedValue({
          id: 1,
          title: 'Book title',
          description: null,
          authors: [],
        });
      });

      it('should respond with the book', () => {
        return request(app.getHttpServer())
          .get('/books/1')
          .expect(200)
          .expect({
            id: 1,
            title: 'Book title',
            description: null,
            authors: [],
          });
      });
    });

    describe('and the book does not exist', () => {
      beforeEach(() => {
        bookFindUniqueMock.mockResolvedValue(undefined);
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer()).get('/books/999').expect(404);
      });
    });

    describe('and :id is not a number', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer()).get('/books/not-a-number').expect(400);
      });
    });
  });

  describe('when the GET /books/author/:authorId endpoint is called', () => {
    beforeEach(() => {
      bookFindManyMock.mockResolvedValue([
        { id: 1, title: 'A', description: null, authors: [{ id: 1 }] },
      ]);
    });

    it('should respond with the books by author', () => {
      return request(app.getHttpServer())
        .get('/books/author/1')
        .expect(200)
        .expect([{ id: 1, title: 'A', description: null, authors: [{ id: 1 }] }]);
    });

    it('should respond with 400 for invalid authorId', () => {
      return request(app.getHttpServer())
        .get('/books/author/not-a-number')
        .expect(400);
    });
  });

  describe('when the POST /books endpoint is called', () => {
    describe('and the user is not authenticated', () => {
      beforeEach(async () => {
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
            canActivate: () => {
              throw new UnauthorizedException();
            },
          })
          .compile();

        app = await createTestApp(module);
      });

      it('should respond with 401', () => {
        return request(app.getHttpServer())
          .post('/books')
          .send({ title: 'New book' })
          .expect(401);
      });
    });

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

    describe('and the book does not exist', () => {
      beforeEach(() => {
        bookUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer())
          .patch('/books/999')
          .send({ title: 'Updated title' })
          .expect(404);
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

  describe('when the POST /books/:bookId/authors/:authorId endpoint is called', () => {
    describe('and the book exists', () => {
      beforeEach(() => {
        bookUpdateMock.mockResolvedValue({
          id: 1,
          title: 'Book title',
          description: null,
          authors: [{ id: 123 }],
        });
      });

      it('should respond with the updated book', () => {
        return request(app.getHttpServer())
          .post('/books/1/authors/123')
          .expect(201)
          .expect({
            id: 1,
            title: 'Book title',
            description: null,
            authors: [{ id: 123 }],
          });
      });
    });

    describe('and the book does not exist', () => {
      beforeEach(() => {
        bookUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer()).post('/books/999/authors/123').expect(404);
      });
    });
  });

  describe('when the DELETE /books/:bookId/authors/:authorId endpoint is called', () => {
    describe('and the book exists', () => {
      beforeEach(() => {
        bookUpdateMock.mockResolvedValue({
          id: 1,
          title: 'Book title',
          description: null,
          authors: [],
        });
      });

      it('should respond with the updated book', () => {
        return request(app.getHttpServer())
          .delete('/books/1/authors/123')
          .expect(200)
          .expect({
            id: 1,
            title: 'Book title',
            description: null,
            authors: [],
          });
      });
    });

    describe('and the book does not exist', () => {
      beforeEach(() => {
        bookUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer())
          .delete('/books/999/authors/123')
          .expect(404);
      });
    });
  });

  describe('when the DELETE /books/:id endpoint is called', () => {
    describe('and the book exists', () => {
      beforeEach(() => {
        bookDeleteMock.mockResolvedValue({ id: 1 });
      });

      it('should respond with 200', () => {
        return request(app.getHttpServer()).delete('/books/1').expect(200);
      });
    });

    describe('and the book does not exist', () => {
      beforeEach(() => {
        bookDeleteMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer()).delete('/books/999').expect(404);
      });
    });
  });
});



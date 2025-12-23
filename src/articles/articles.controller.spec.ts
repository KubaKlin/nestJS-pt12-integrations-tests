import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { createTestApp } from '../test-utils/supertest-app';
import { mockJwtAuthenticationGuard } from '../test-utils/mock-jwt-auth-guard';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { CommentsService } from '../comments/comments.service';
import { Prisma } from '../../generated/prisma';
import { PrismaError } from '../database/prisma-error.enum';

describe('The ArticlesController', () => {
  let app: INestApplication;

  let articleCreateMock: jest.Mock;
  let articleFindManyMock: jest.Mock;
  let articleFindUniqueMock: jest.Mock;
  let articleUpdateMock: jest.Mock;

  let transactionArticleFindUniqueMock: jest.Mock;
  let transactionArticleUpdateMock: jest.Mock;
  let transactionMock: jest.Mock;

  let commentCreateMock: jest.Mock;
  let commentFindManyMock: jest.Mock;
  let commentUpdateMock: jest.Mock;
  let commentDeleteMock: jest.Mock;

  beforeEach(async () => {
    articleCreateMock = jest.fn();
    articleFindManyMock = jest.fn();
    articleFindUniqueMock = jest.fn();
    articleUpdateMock = jest.fn();

    transactionArticleFindUniqueMock = jest.fn();
    transactionArticleUpdateMock = jest.fn();

    const transactionClient = {
      article: {
        findUnique: transactionArticleFindUniqueMock,
        update: transactionArticleUpdateMock,
      },
    };

    transactionMock = jest.fn(async (callback: (client: any) => any) => {
      return await callback(transactionClient);
    });

    commentCreateMock = jest.fn();
    commentFindManyMock = jest.fn();
    commentUpdateMock = jest.fn();
    commentDeleteMock = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        ArticlesService,
        CommentsService,
        {
          provide: PrismaService,
          useValue: {
            article: {
              create: articleCreateMock,
              findMany: articleFindManyMock,
              findUnique: articleFindUniqueMock,
              update: articleUpdateMock,
            },
            comment: {
              create: commentCreateMock,
              findMany: commentFindManyMock,
              update: commentUpdateMock,
              delete: commentDeleteMock,
            },
            $transaction: transactionMock,
          },
        },
      ],
      controllers: [ArticlesController],
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

  const createKnownRequestError = (code: string) => {
    return new Prisma.PrismaClientKnownRequestError('Known Prisma error', {
      code,
      clientVersion: 'test',
    } as any);
  };

  describe('when the GET /articles endpoint is called', () => {
    beforeEach(() => {
      articleFindManyMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    });

    it('should respond with the articles', () => {
      return request(app.getHttpServer()).get('/articles').expect(200).expect([
        { id: 1 },
        { id: 2 },
      ]);
    });
  });

  describe('when the GET /articles/:id endpoint is called', () => {
    describe('and the article exists', () => {
      beforeEach(() => {
        articleFindUniqueMock.mockResolvedValue({
          id: 1,
          title: 'Title',
          text: 'Text',
          author: { id: 1 },
          categories: [],
        });
      });

      it('should respond with the article', () => {
        return request(app.getHttpServer())
          .get('/articles/1')
          .expect(200)
          .expect({
            id: 1,
            title: 'Title',
            text: 'Text',
            author: { id: 1 },
            categories: [],
          });
      });
    });

    describe('and the article does not exist', () => {
      beforeEach(() => {
        articleFindUniqueMock.mockResolvedValue(undefined);
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer()).get('/articles/999').expect(404);
      });
    });

    describe('and :id is not a number', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer()).get('/articles/not-a-number').expect(400);
      });
    });
  });

  describe('when the POST /articles endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer()).post('/articles').send({}).expect(400);
      });
    });

    describe('and the correct data is provided', () => {
      beforeEach(() => {
        articleCreateMock.mockResolvedValue({
          id: 1,
          title: 'Title',
          text: 'Text',
          categories: [],
        });
      });

      it('should respond with the created article', () => {
        return request(app.getHttpServer())
          .post('/articles')
          .send({ title: 'Title', text: 'Text' })
          .expect(201)
          .expect({
            id: 1,
            title: 'Title',
            text: 'Text',
            categories: [],
          });
      });
    });
  });

  describe('when the PATCH /articles/:id endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .patch('/articles/1')
          .send({ title: '' })
          .expect(400);
      });
    });

    describe('and the article does not exist', () => {
      beforeEach(() => {
        articleUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer())
          .patch('/articles/999')
          .send({ title: 'Updated' })
          .expect(404);
      });
    });

    describe('and the correct data is provided', () => {
      beforeEach(() => {
        articleUpdateMock.mockResolvedValue({ id: 1, title: 'Updated', text: 'Text' });
      });

      it('should respond with the updated article', () => {
        return request(app.getHttpServer())
          .patch('/articles/1')
          .send({ title: 'Updated' })
          .expect(200)
          .expect({ id: 1, title: 'Updated', text: 'Text' });
      });
    });
  });

  describe('when the POST /articles/:articleId/comments endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .post('/articles/1/comments')
          .send({ content: '' })
          .expect(400);
      });
    });

    describe('and the article does not exist', () => {
      beforeEach(() => {
        commentCreateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .post('/articles/999/comments')
          .send({ content: 'Nice' })
          .expect(400);
      });
    });

    describe('and the correct data is provided', () => {
      beforeEach(() => {
        commentCreateMock.mockResolvedValue({ id: 5, articleId: 1, content: 'Nice' });
      });

      it('should respond with the new comment', () => {
        return request(app.getHttpServer())
          .post('/articles/1/comments')
          .send({ content: 'Nice' })
          .expect(201)
          .expect({ id: 5, articleId: 1, content: 'Nice' });
      });
    });
  });

  describe('when the PATCH /articles/:id/upvote endpoint is called', () => {
    describe('and the article does not exist', () => {
      beforeEach(() => {
        articleUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer()).patch('/articles/999/upvote').expect(404);
      });
    });

    describe('and the article exists', () => {
      beforeEach(() => {
        articleUpdateMock.mockResolvedValue({ id: 1, upvotes: 1 });
      });

      it('should respond with the updated article', () => {
        return request(app.getHttpServer())
          .patch('/articles/1/upvote')
          .expect(200)
          .expect({ id: 1, upvotes: 1 });
      });
    });
  });

  describe('when the PATCH /articles/:id/downvote endpoint is called', () => {
    describe('and the article exists and has upvotes > 0', () => {
      beforeEach(() => {
        transactionArticleFindUniqueMock.mockResolvedValue({ id: 1, upvotes: 2 });
        transactionArticleUpdateMock.mockResolvedValue({ id: 1, upvotes: 1 });
      });

      it('should respond with the updated article', () => {
        return request(app.getHttpServer())
          .patch('/articles/1/downvote')
          .expect(200)
          .expect({ id: 1, upvotes: 1 });
      });
    });

    describe('and the article exists and has upvotes = 0', () => {
      beforeEach(() => {
        transactionArticleFindUniqueMock.mockResolvedValue({ id: 1, upvotes: 0 });
        transactionArticleUpdateMock.mockResolvedValue({ id: 1, upvotes: 0 });
      });

      it('should not decrement below 0', () => {
        return request(app.getHttpServer())
          .patch('/articles/1/downvote')
          .expect(200)
          .expect({ id: 1, upvotes: 0 });
      });
    });

    describe('and the article does not exist', () => {
      beforeEach(() => {
        transactionArticleFindUniqueMock.mockResolvedValue(undefined);
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer()).patch('/articles/999/downvote').expect(404);
      });
    });

    describe('and prisma throws RecordDoesNotExist while updating', () => {
      beforeEach(() => {
        transactionArticleFindUniqueMock.mockResolvedValue({ id: 1, upvotes: 1 });
        transactionArticleUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer()).patch('/articles/1/downvote').expect(404);
      });
    });

    describe('and :id is not a number', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .patch('/articles/not-a-number/downvote')
          .expect(400);
      });
    });
  });
});



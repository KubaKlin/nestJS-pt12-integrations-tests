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

describe('The ArticlesController', () => {
  let app: INestApplication;

  let articleCreateMock: jest.Mock;
  let articleFindManyMock: jest.Mock;
  let articleFindUniqueMock: jest.Mock;
  let articleUpdateMock: jest.Mock;

  let commentCreateMock: jest.Mock;
  let commentFindManyMock: jest.Mock;
  let commentUpdateMock: jest.Mock;
  let commentDeleteMock: jest.Mock;

  beforeEach(async () => {
    articleCreateMock = jest.fn();
    articleFindManyMock = jest.fn();
    articleFindUniqueMock = jest.fn();
    articleUpdateMock = jest.fn();

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



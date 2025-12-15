import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma';
import { PrismaError } from '../database/prisma-error.enum';
import { PrismaService } from '../database/prisma.service';
import { ArticleNotFoundException } from './article-not-fount.exception';
import { ArticlesService } from './articles.service';
import { ArticleDto } from './article.dto';
import { CreateArticleDto } from './create-article.dto';

describe('The ArticlesService', () => {
  let articlesService: ArticlesService;

  let articleCreateMock: jest.Mock;
  let articleFindManyMock: jest.Mock;
  let articleFindUniqueMock: jest.Mock;
  let articleDeleteMock: jest.Mock;
  let articleUpdateMock: jest.Mock;
  let articleUpdateManyMock: jest.Mock;
  let articleDeleteManyMock: jest.Mock;

  let transactionArticleFindUniqueMock: jest.Mock;
  let transactionArticleUpdateMock: jest.Mock;
  let transactionArticleFindManyMock: jest.Mock;
  let transactionArticleDeleteManyMock: jest.Mock;
  let transactionArticleUpdateManyMock: jest.Mock;
  let transactionUserFindUniqueMock: jest.Mock;

  let transactionMock: jest.Mock;

  const createKnownRequestError = (code: string) => {
    return new Prisma.PrismaClientKnownRequestError('Known Prisma error', {
      code,
      clientVersion: 'test',
    } as any);
  };

  beforeEach(async () => {
    articleCreateMock = jest.fn();
    articleFindManyMock = jest.fn();
    articleFindUniqueMock = jest.fn();
    articleDeleteMock = jest.fn();
    articleUpdateMock = jest.fn();
    articleUpdateManyMock = jest.fn();
    articleDeleteManyMock = jest.fn();

    transactionArticleFindUniqueMock = jest.fn();
    transactionArticleUpdateMock = jest.fn();
    transactionArticleFindManyMock = jest.fn();
    transactionArticleDeleteManyMock = jest.fn();
    transactionArticleUpdateManyMock = jest.fn();
    transactionUserFindUniqueMock = jest.fn();

    const transactionClient = {
      article: {
        findUnique: transactionArticleFindUniqueMock,
        update: transactionArticleUpdateMock,
        findMany: transactionArticleFindManyMock,
        deleteMany: transactionArticleDeleteManyMock,
        updateMany: transactionArticleUpdateManyMock,
      },
      user: {
        findUnique: transactionUserFindUniqueMock,
      },
    };

    transactionMock = jest.fn(async (callback: (client: any) => any) => {
      return await callback(transactionClient);
    });

    const module = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: PrismaService,
          useValue: {
            article: {
              create: articleCreateMock,
              findMany: articleFindManyMock,
              findUnique: articleFindUniqueMock,
              delete: articleDeleteMock,
              update: articleUpdateMock,
              updateMany: articleUpdateManyMock,
              deleteMany: articleDeleteManyMock,
            },
            $transaction: transactionMock,
          },
        },
      ],
    }).compile();

    articlesService = await module.get(ArticlesService);
  });

  describe('when the create function is called', () => {
    let createArticleDto: CreateArticleDto;

    beforeEach(() => {
      createArticleDto = {
        title: 'Title',
        text: 'Text',
        categoryIds: [1, 2],
      };
    });

    describe('and prisma creates the article successfully', () => {
      beforeEach(() => {
        articleCreateMock.mockResolvedValue({ id: 1 });
      });

      it('should map categoryIds to connect objects and return created article', async () => {
        const result = await articlesService.create(createArticleDto, 10);

        expect(articleCreateMock).toHaveBeenCalledWith({
          data: {
            title: createArticleDto.title,
            text: createArticleDto.text,
            author: {
              connect: {
                id: 10,
              },
            },
            categories: {
              connect: [{ id: 1 }, { id: 2 }],
            },
          },
          include: {
            categories: true,
          },
        });
        expect(result).toEqual({ id: 1 });
      });
    });

    describe('and prisma throws RecordDoesNotExist', () => {
      beforeEach(() => {
        articleCreateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should throw BadRequestException', async () => {
        return expect(async () => {
          await articlesService.create(createArticleDto, 10);
        }).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('when the getAll function is called', () => {
    describe('and prisma returns all articles', () => {
      beforeEach(() => {
        articleFindManyMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      });

      it('should return the articles', async () => {
        const result = await articlesService.getAll();
        expect(result).toEqual([{ id: 1 }, { id: 2 }]);
      });
    });
  });

  describe('when the getById function is called', () => {
    describe('and prisma returns the article', () => {
      beforeEach(() => {
        articleFindUniqueMock.mockResolvedValue({ id: 1 });
      });

      it('should return the article', async () => {
        const result = await articlesService.getById(1);
        expect(result).toEqual({ id: 1 });
      });
    });

    describe('and prisma does not return the article', () => {
      beforeEach(() => {
        articleFindUniqueMock.mockResolvedValue(undefined);
      });

      it('should throw ArticleNotFoundException', async () => {
        return expect(async () => {
          await articlesService.getById(1);
        }).rejects.toThrow(ArticleNotFoundException);
      });
    });
  });

  describe('when the delete function is called', () => {
    describe('and prisma deletes the article', () => {
      beforeEach(() => {
        articleDeleteMock.mockResolvedValue({ id: 1 });
      });

      it('should return the deleted article', async () => {
        const result = await articlesService.delete(1);
        expect(result).toEqual({ id: 1 });
      });
    });

    describe('and prisma throws RecordDoesNotExist', () => {
      beforeEach(() => {
        articleDeleteMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should throw ArticleNotFoundException', async () => {
        return expect(async () => {
          await articlesService.delete(1);
        }).rejects.toThrow(ArticleNotFoundException);
      });
    });
  });

  describe('when the update function is called', () => {
    let articleDto: ArticleDto;

    beforeEach(() => {
      articleDto = {
        title: 'New title',
        text: 'New text',
      };
    });

    describe('and prisma updates the article', () => {
      beforeEach(() => {
        articleUpdateMock.mockResolvedValue({ id: 1, ...articleDto });
      });

      it('should pass data and return updated article', async () => {
        const result = await articlesService.update(1, articleDto);

        expect(articleUpdateMock).toHaveBeenCalledWith({
          data: {
            ...articleDto,
            id: undefined,
          },
          where: {
            id: 1,
          },
        });
        expect(result).toEqual({ id: 1, ...articleDto });
      });
    });

    describe('and prisma throws RecordDoesNotExist', () => {
      beforeEach(() => {
        articleUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should throw ArticleNotFoundException', async () => {
        return expect(async () => {
          await articlesService.update(1, articleDto);
        }).rejects.toThrow(ArticleNotFoundException);
      });
    });
  });

  describe('when the upvote function is called', () => {
    describe('and prisma updates the upvotes', () => {
      beforeEach(() => {
        articleUpdateMock.mockResolvedValue({ id: 1, upvotes: 6 });
      });

      it('should increment upvotes by 1 and return the article', async () => {
        const result = await articlesService.upvote(1);

        expect(articleUpdateMock).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { upvotes: { increment: 1 } },
        });
        expect(result).toEqual({ id: 1, upvotes: 6 });
      });
    });

    describe('and prisma throws RecordDoesNotExist', () => {
      beforeEach(() => {
        articleUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should throw ArticleNotFoundException', async () => {
        return expect(async () => {
          await articlesService.upvote(1);
        }).rejects.toThrow(ArticleNotFoundException);
      });
    });
  });

  describe('when the downvote function is called', () => {
    describe('and the article exists and has upvotes > 0', () => {
      beforeEach(() => {
        transactionArticleFindUniqueMock.mockResolvedValue({
          id: 1,
          upvotes: 2,
        });
        transactionArticleUpdateMock.mockResolvedValue({ id: 1, upvotes: 1 });
      });

      it('should decrement upvotes by 1', async () => {
        const result = await articlesService.downvote(1);

        expect(transactionArticleUpdateMock).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { upvotes: { decrement: 1 } },
        });
        expect(result).toEqual({ id: 1, upvotes: 1 });
      });
    });

    describe('and the article exists and has upvotes = 0', () => {
      beforeEach(() => {
        transactionArticleFindUniqueMock.mockResolvedValue({
          id: 1,
          upvotes: 0,
        });
        transactionArticleUpdateMock.mockResolvedValue({ id: 1, upvotes: 0 });
      });

      it('should not decrement below 0', async () => {
        const result = await articlesService.downvote(1);

        expect(transactionArticleUpdateMock).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { upvotes: { decrement: 0 } },
        });
        expect(result).toEqual({ id: 1, upvotes: 0 });
      });
    });

    describe('and the article does not exist', () => {
      beforeEach(() => {
        transactionArticleFindUniqueMock.mockResolvedValue(undefined);
      });

      it('should throw ArticleNotFoundException', async () => {
        return expect(async () => {
          await articlesService.downvote(1);
        }).rejects.toThrow(ArticleNotFoundException);
      });
    });

    describe('and prisma throws RecordDoesNotExist while updating', () => {
      beforeEach(() => {
        transactionArticleFindUniqueMock.mockResolvedValue({
          id: 1,
          upvotes: 1,
        });
        transactionArticleUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should throw ArticleNotFoundException', async () => {
        return expect(async () => {
          await articlesService.downvote(1);
        }).rejects.toThrow(ArticleNotFoundException);
      });
    });
  });

  describe('when the deleteByUpvotesFewerThan function is called', () => {
    describe('and there are no matching articles', () => {
      beforeEach(() => {
        transactionArticleFindManyMock.mockResolvedValue([]);
      });

      it('should throw NotFoundException', async () => {
        return expect(async () => {
          await articlesService.deleteByUpvotesFewerThan(5);
        }).rejects.toThrow(NotFoundException);
      });
    });

    describe('and matching articles exist', () => {
      beforeEach(() => {
        transactionArticleFindManyMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        transactionArticleDeleteManyMock.mockResolvedValue({ count: 2 });
      });

      it('should delete the articles and return a summary', async () => {
        const result = await articlesService.deleteByUpvotesFewerThan(5);

        expect(transactionArticleFindManyMock).toHaveBeenCalledWith({
          where: { upvotes: { lt: 5 } },
          select: { id: true },
        });
        expect(transactionArticleDeleteManyMock).toHaveBeenCalledWith({
          where: { upvotes: { lt: 5 } },
        });
        expect(result).toEqual({
          deletedCount: 2,
          message:
            'Successfully deleted 2 article(s) with upvotes fewer than 5',
        });
      });
    });
  });

  describe('when the reassignArticles function is called', () => {
    describe('and the previous author does not exist', () => {
      beforeEach(() => {
        transactionUserFindUniqueMock.mockResolvedValueOnce(undefined);
      });

      it('should throw NotFoundException', async () => {
        return expect(async () => {
          await articlesService.reassignArticles(1, 2);
        }).rejects.toThrow(NotFoundException);
      });
    });

    describe('and the new author does not exist', () => {
      beforeEach(() => {
        transactionUserFindUniqueMock.mockResolvedValueOnce({ id: 1 });
        transactionUserFindUniqueMock.mockResolvedValueOnce(undefined);
      });

      it('should throw NotFoundException', async () => {
        return expect(async () => {
          await articlesService.reassignArticles(1, 2);
        }).rejects.toThrow(NotFoundException);
      });
    });

    describe('and both authors exist', () => {
      beforeEach(() => {
        transactionUserFindUniqueMock.mockResolvedValueOnce({ id: 1 });
        transactionUserFindUniqueMock.mockResolvedValueOnce({ id: 2 });
        transactionArticleUpdateManyMock.mockResolvedValue({ count: 3 });
      });

      it('should reassign articles and return a summary', async () => {
        const result = await articlesService.reassignArticles(1, 2);

        expect(transactionArticleUpdateManyMock).toHaveBeenCalledWith({
          where: { authorId: 1 },
          data: { authorId: 2 },
        });
        expect(result).toEqual({
          reassignedCount: 3,
          message:
            'Successfully reassigned 3 article(s) from author 1 to author 2',
        });
      });
    });
  });
});



import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../database/prisma.service';
import { CategoriesMergeController } from './categories-merge.controller';
import { CategoriesMergeService } from './categories-merge.service';
import { createTestApp } from '../test-utils/supertest-app';

describe('The CategoriesMergeController', () => {
  let app: INestApplication;

  let transactionCategoryFindManyMock: jest.Mock;
  let transactionCategoryUpdateMock: jest.Mock;
  let transactionCategoryDeleteManyMock: jest.Mock;
  let transactionMock: jest.Mock;

  beforeEach(async () => {
    transactionCategoryFindManyMock = jest.fn();
    transactionCategoryUpdateMock = jest.fn();
    transactionCategoryDeleteManyMock = jest.fn();

    const transactionClient = {
      category: {
        findMany: transactionCategoryFindManyMock,
        update: transactionCategoryUpdateMock,
        deleteMany: transactionCategoryDeleteManyMock,
      },
    };

    transactionMock = jest.fn(async (callback: (client: any) => any) => {
      return await callback(transactionClient);
    });

    const module = await Test.createTestingModule({
      providers: [
        CategoriesMergeService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: transactionMock,
          },
        },
      ],
      controllers: [CategoriesMergeController],
    }).compile();

    app = await createTestApp(module);
  });

  describe('when the PATCH /categories-merge endpoint is called', () => {
    describe('and there are no duplicate categories', () => {
      beforeEach(() => {
        transactionCategoryFindManyMock.mockResolvedValue([
          { id: 1, name: 'Science', articles: [] },
          { id: 2, name: 'Tech', articles: [] },
        ]);
      });

      it('should respond with a no-op message', () => {
        return request(app.getHttpServer())
          .patch('/categories-merge')
          .expect(200)
          .expect({
            message: 'No duplicate categories found',
            mergedCategories: [],
            totalMerged: 0,
          });
      });
    });

    describe('and duplicates exist', () => {
      beforeEach(() => {
        transactionCategoryFindManyMock.mockResolvedValue([
          { id: 1, name: 'Science', articles: [{ id: 1 }] },
          { id: 2, name: ' science ', articles: [{ id: 2 }] },
        ]);
        transactionCategoryUpdateMock.mockResolvedValue({ id: 1 });
        transactionCategoryDeleteManyMock.mockResolvedValue({ count: 1 });
      });

      it('should merge duplicates and respond with a summary', () => {
        return request(app.getHttpServer())
          .patch('/categories-merge')
          .expect(200)
          .expect({
            message: 'Successfully merged 1 duplicate category group(s)',
            mergedCategories: [
              {
                categoryName: 'Science',
                keptCategoryId: 1,
                deletedCategoryIds: [2],
                articlesTransferred: 1,
              },
            ],
            totalMerged: 1,
          });
      });
    });
  });
});



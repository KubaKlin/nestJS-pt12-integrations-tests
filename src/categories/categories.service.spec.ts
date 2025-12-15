import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma';
import { PrismaError } from '../database/prisma-error.enum';
import { PrismaService } from '../database/prisma.service';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './create-category.dto';
import { UpdateCategoryDto } from './update-category.dto';

describe('The CategoriesService', () => {
  let categoriesService: CategoriesService;

  let categoryFindManyMock: jest.Mock;
  let categoryFindUniqueMock: jest.Mock;
  let categoryCreateMock: jest.Mock;
  let categoryUpdateMock: jest.Mock;
  let categoryDeleteMock: jest.Mock;

  const createKnownRequestError = (code: string) => {
    return new Prisma.PrismaClientKnownRequestError('Known Prisma error', {
      code,
      clientVersion: 'test',
    } as any);
  };

  beforeEach(async () => {
    categoryFindManyMock = jest.fn();
    categoryFindUniqueMock = jest.fn();
    categoryCreateMock = jest.fn();
    categoryUpdateMock = jest.fn();
    categoryDeleteMock = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: {
            category: {
              findMany: categoryFindManyMock,
              findUnique: categoryFindUniqueMock,
              create: categoryCreateMock,
              update: categoryUpdateMock,
              delete: categoryDeleteMock,
            },
          },
        },
      ],
    }).compile();

    categoriesService = await module.get(CategoriesService);
  });

  describe('when the getAll function is called', () => {
    describe('and prisma returns the categories', () => {
      beforeEach(() => {
        categoryFindManyMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      });

      it('should return the categories', async () => {
        const result = await categoriesService.getAll();
        expect(result).toEqual([{ id: 1 }, { id: 2 }]);
      });
    });
  });

  describe('when the getById function is called', () => {
    describe('and prisma returns the category', () => {
      beforeEach(() => {
        categoryFindUniqueMock.mockResolvedValue({ id: 1, articles: [] });
      });

      it('should return the category', async () => {
        const result = await categoriesService.getById(1);
        expect(result).toEqual({ id: 1, articles: [] });
      });
    });

    describe('and prisma does not return the category', () => {
      beforeEach(() => {
        categoryFindUniqueMock.mockResolvedValue(undefined);
      });

      it('should throw the NotFoundException', async () => {
        return expect(async () => {
          await categoriesService.getById(1);
        }).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('when the create function is called', () => {
    let createCategoryDto: CreateCategoryDto;

    beforeEach(() => {
      createCategoryDto = {
        name: 'Science',
      };
      categoryCreateMock.mockResolvedValue({ id: 1, name: createCategoryDto.name });
    });

    it('should create the category', async () => {
      const result = await categoriesService.create(createCategoryDto);

      expect(categoryCreateMock).toHaveBeenCalledWith({
        data: {
          name: createCategoryDto.name,
        },
      });
      expect(result).toEqual({ id: 1, name: createCategoryDto.name });
    });
  });

  describe('when the update function is called', () => {
    let updateCategoryDto: UpdateCategoryDto;

    beforeEach(() => {
      updateCategoryDto = {
        name: 'New name',
      };
    });

    describe('and prisma updates the category', () => {
      beforeEach(() => {
        categoryUpdateMock.mockResolvedValue({ id: 1, name: updateCategoryDto.name });
      });

      it('should return the updated category', async () => {
        const result = await categoriesService.update(1, updateCategoryDto);

        expect(categoryUpdateMock).toHaveBeenCalledWith({
          data: {
            name: updateCategoryDto.name,
          },
          where: {
            id: 1,
          },
        });
        expect(result).toEqual({ id: 1, name: updateCategoryDto.name });
      });
    });

    describe('and prisma throws RecordDoesNotExist', () => {
      beforeEach(() => {
        categoryUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should throw the NotFoundException', async () => {
        return expect(async () => {
          await categoriesService.update(999, updateCategoryDto);
        }).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('when the delete function is called', () => {
    describe('and prisma deletes the category', () => {
      beforeEach(() => {
        categoryDeleteMock.mockResolvedValue({ id: 1 });
      });

      it('should return the deleted category', async () => {
        const result = await categoriesService.delete(1);
        expect(result).toEqual({ id: 1 });
      });
    });

    describe('and prisma throws RecordDoesNotExist', () => {
      beforeEach(() => {
        categoryDeleteMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should throw the NotFoundException', async () => {
        return expect(async () => {
          await categoriesService.delete(999);
        }).rejects.toThrow(NotFoundException);
      });
    });
  });
});



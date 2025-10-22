import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MultiProvider, MultiProviderDocument } from '../multi-provider.schema';
import { MultiProviderRepository } from './multi-provider.repository';
import { MultiProviderFilters } from '../application/services/multi-provider.service';

@Injectable()
export class MultiProviderRepositoryImpl implements MultiProviderRepository {
  constructor(
    @InjectModel(MultiProvider.name)
    private multiProviderModel: Model<MultiProviderDocument>,
  ) {}

  async create(multiProvider: any): Promise<any> {
    const created = new this.multiProviderModel(multiProvider);
    return created.save();
  }

  async findById(id: string): Promise<any | null> {
    return this.multiProviderModel.findById(id).exec();
  }

  async findByName(name: string): Promise<any | null> {
    return this.multiProviderModel.findOne({ name }).exec();
  }

  async find(filters: MultiProviderFilters): Promise<{
    multiProviders: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = {};

    if (filters.name) {
      query.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters.priority !== undefined) {
      query.priority = filters.priority;
    }

    const total = await this.multiProviderModel.countDocuments(query);
    const page = 1;
    const limit = filters.limit || 10;
    const skip = filters.offset || 0;

    const multiProviders = await this.multiProviderModel
      .find(query)
      .sort({ priority: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      multiProviders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, multiProvider: any): Promise<any> {
    return this.multiProviderModel.findByIdAndUpdate(id, multiProvider, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.multiProviderModel.findByIdAndDelete(id).exec();
  }

  async findByType(type: string): Promise<any[]> {
    return this.multiProviderModel.find({ type, isActive: true }).sort({ priority: 1 }).exec();
  }

  async findActive(): Promise<any[]> {
    return this.multiProviderModel.find({ isActive: true }).sort({ priority: 1 }).exec();
  }

  async findByPriority(): Promise<any[]> {
    return this.multiProviderModel.find({ isActive: true }).sort({ priority: 1 }).exec();
  }

  async getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    active: number;
    inactive: number;
    averagePriority: number;
  }> {
    const total = await this.multiProviderModel.countDocuments();
    const byType = await this.multiProviderModel.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const active = await this.multiProviderModel.countDocuments({ isActive: true });
    const inactive = await this.multiProviderModel.countDocuments({ isActive: false });
    const averagePriority = await this.multiProviderModel.aggregate([
      { $group: { _id: null, average: { $avg: '$priority' } } },
    ]);

    return {
      total,
      byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      active,
      inactive,
      averagePriority: averagePriority[0]?.average || 0,
    };
  }

  async export(
    filters: MultiProviderFilters,
    format: 'json' | 'csv' | 'excel',
  ): Promise<{
    data: any;
    format: string;
    count: number;
    timestamp: Date;
  }> {
    const { multiProviders } = await this.find(filters);
    return {
      data: multiProviders,
      format,
      count: multiProviders.length,
      timestamp: new Date(),
    };
  }
}

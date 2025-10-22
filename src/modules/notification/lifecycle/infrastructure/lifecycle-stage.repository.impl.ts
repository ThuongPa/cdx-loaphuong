import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LifecycleStageRepository } from './lifecycle-stage.repository';
import { LifecycleStage } from '../domain/lifecycle-stage.entity';
import { LifecycleStageQuery } from '../application/services/lifecycle-stage.service';

@Injectable()
export class LifecycleStageRepositoryImpl implements LifecycleStageRepository {
  constructor(@InjectModel('LifecycleStage') private readonly lifecycleStageModel: Model<any>) {}

  async save(stage: LifecycleStage): Promise<LifecycleStage> {
    const data = stage.toPersistence();
    const saved = await this.lifecycleStageModel.create(data);
    return LifecycleStage.fromPersistence(saved.toObject());
  }

  async findById(id: string): Promise<LifecycleStage | null> {
    const document = await this.lifecycleStageModel.findById(id).exec();
    if (!document) return null;
    return LifecycleStage.fromPersistence(document.toObject());
  }

  async findByName(name: string): Promise<LifecycleStage | null> {
    const document = await this.lifecycleStageModel.findOne({ name }).exec();
    if (!document) return null;
    return LifecycleStage.fromPersistence(document.toObject());
  }

  async findByOrder(order: number): Promise<LifecycleStage | null> {
    const document = await this.lifecycleStageModel.findOne({ order }).exec();
    if (!document) return null;
    return LifecycleStage.fromPersistence(document.toObject());
  }

  async findMany(
    query: LifecycleStageQuery,
  ): Promise<{ stages: LifecycleStage[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, sortBy = 'order', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.order !== undefined) {
      filter.order = query.order;
    }

    if (query.createdBy) {
      filter.createdBy = query.createdBy;
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [documents, total] = await Promise.all([
      this.lifecycleStageModel.find(filter).sort(sortOptions).skip(skip).limit(limit).exec(),
      this.lifecycleStageModel.countDocuments(filter).exec(),
    ]);

    const stages = documents.map((doc) => LifecycleStage.fromPersistence(doc.toObject()));

    return {
      stages,
      total,
      page,
      limit,
    };
  }

  async findActive(): Promise<LifecycleStage[]> {
    const documents = await this.lifecycleStageModel
      .find({ isActive: true })
      .sort({ order: 1 })
      .exec();
    return documents.map((doc) => LifecycleStage.fromPersistence(doc.toObject()));
  }

  async findByOrderSequence(): Promise<LifecycleStage[]> {
    const documents = await this.lifecycleStageModel.find().sort({ order: 1 }).exec();
    return documents.map((doc) => LifecycleStage.fromPersistence(doc.toObject()));
  }

  async findByType(type: string): Promise<LifecycleStage[]> {
    const documents = await this.lifecycleStageModel.find({ type }).exec();
    return documents.map((doc) => LifecycleStage.fromPersistence(doc.toObject()));
  }

  async findByUser(userId: string): Promise<LifecycleStage[]> {
    const documents = await this.lifecycleStageModel.find({ createdBy: userId }).exec();
    return documents.map((doc) => LifecycleStage.fromPersistence(doc.toObject()));
  }

  async search(searchTerm: string): Promise<LifecycleStage[]> {
    const documents = await this.lifecycleStageModel
      .find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .exec();
    return documents.map((doc) => LifecycleStage.fromPersistence(doc.toObject()));
  }

  async delete(id: string): Promise<void> {
    await this.lifecycleStageModel.findByIdAndDelete(id).exec();
  }
}

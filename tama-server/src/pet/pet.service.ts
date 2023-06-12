import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { CreatePetDTO } from './dto/create-pet.dto';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Pet } from './schema/pet.schema';
import { Stage } from './types/status.type';
import { Status } from './schema/status.schema';

@Injectable()
export class PetService {
  constructor(
    @InjectModel(Pet.name) private petModel: Model<Pet>,
    @InjectModel(Status.name) private statusModel: Model<Status>,
  ) {}

  async createPet(createPetDTO: CreatePetDTO): Promise<Pet> {
    const { name } = createPetDTO;

    const status = new this.statusModel();
    await status.save();

    const pet = new this.petModel({ name, status: status._id });
    return await pet.save();
  }

  async getPetList(): Promise<Pet[]> {
    return await this.petModel.find().populate('status');
  }

  @Cron('*/5 * * * * *', {})
  async checkGrowth() {
    const statusList = await this.statusModel.find();

    const promises = statusList.map(async (status) => {
      if (status.stage === '사망') return;

      await this.statusModel.updateOne(
        { _id: status._id },
        { $set: { stage: this.grow(status.stage) } },
      );
    });

    await Promise.all(promises);
  }

  grow(current: Stage): Stage {
    switch (current) {
      case '알':
        return '유년기';
      case '유년기':
        return '청소년기';
      case '청소년기':
        return '성년기';
      case '성년기':
        return '사망';
      case '사망':
        return '사망';
      default:
        return '알';
    }
  }
}

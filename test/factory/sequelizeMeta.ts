import { Factory } from 'factory-waifu';
import { faker } from '@faker-js/faker';
import { SequelizeMeta } from 'db/models';

/** Defines all the sequelize meta schematics for a factory */
export function defineSequelizeMetaFactory(factory: Factory): void {
  factory.define('sequelizeMeta', SequelizeMeta, () => {
    return {
      name: faker.lorem.word()
    };
  });
}

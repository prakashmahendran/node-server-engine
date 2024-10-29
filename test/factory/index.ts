import { factory } from 'factory-waifu';
import { defineSequelizeMetaFactory } from './sequelizeMeta';

/** Generates and defines a factory object that can create all of our data models */
defineSequelizeMetaFactory(factory);

export default factory;
export { factory };

import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table
export class SequelizeMeta extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  version: string = '';
}

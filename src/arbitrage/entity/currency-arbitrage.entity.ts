import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CurrencyArbitrage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  currencyId: string;

  @Column()
  currencyName: string;

  @Column()
  name: string;

  @Column()
  comparedWith: string;

  @Column('decimal', { precision: 5, scale: 2 })
  diffPercentage: number;

  @Column('decimal', { precision: 5, scale: 2 })
  label: number;

  @Column('timestamp')
  actionTimestamp: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  targetPrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  actionPrice: number;

  @Column({ default: false })
  isTouchedTarget: boolean;

  @Column({ nullable: true })
  targetTouchTimestamp: Date | null;
}

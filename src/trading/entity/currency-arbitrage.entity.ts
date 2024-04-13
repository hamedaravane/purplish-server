import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class CurrencyArbitrage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  currencyId: string;

  @Column()
  currencyName: string;

  @Column()
  comparisonExchange: string;

  @Column('decimal', {
    precision: 5,
    scale: 3,
  })
  priceDiffPercentage: number;

  @Column('decimal', {
    precision: 18,
    scale: 15,
  })
  currentBuyPrice: number;

  @Column('decimal', {
    precision: 18,
    scale: 15,
  })
  currentSellPrice: number;

  @Column('decimal', {
    precision: 18,
    scale: 15,
  })
  targetPrice: number;

  @Column({ default: false })
  isTouchedTarget: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: ['short', 'long'],
  })
  position: 'short' | 'long';

  @Column('bigint')
  currentBuyVolume: number;

  @Column('bigint')
  currentSellVolume: number;

  @Column('decimal', {
    precision: 8,
    scale: 2,
  })
  label: number;
}

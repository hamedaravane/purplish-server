import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column('decimal', {
    precision: 5,
    scale: 3,
  })
  diffPercentage: number;

  @Column('decimal', {
    precision: 8,
    scale: 2,
  })
  label: number;

  @Column('timestamp')
  actionTimestamp: Date;

  @Column('decimal', {
    precision: 30,
    scale: 15,
  })
  targetPrice: number;

  @Column('decimal', {
    precision: 30,
    scale: 15,
  })
  actionPrice: number;

  @Column('decimal', {
    precision: 30,
    scale: 15,
  })
  currentPrice: number;

  @Column({ default: false })
  isTouchedTarget: boolean;

  @Column({ nullable: true })
  targetTouchTimestamp: Date | null;
}

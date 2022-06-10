import { InjectModel } from '@nestjs/sequelize';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Tweet } from '../entities/tweet.entity';
import { Interval } from '@nestjs/schedule';
import { Cache } from 'cache-manager';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class TweetsCountService {
  private limit: number = 10;

  constructor(
    @InjectModel(Tweet)
    private tweetModel: typeof Tweet,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    @InjectQueue('emails')
    private emailsQueue: Queue,
  ) {}

  @Interval(5000)
  async countTweets() {
    let offset = await this.cacheManager.get<number>('tweet-offset');
    offset = offset === undefined ? 0 : offset;

    const tweets = await this.tweetModel.findAll({
      offset: offset,
      limit: this.limit,
    });

    if (tweets.length === this.limit) {
      offset + this.limit;
      this.cacheManager.set('tweet-offset', offset + this.limit, {
        ttl: 1 * 60 * 10,
      });
      this.emailsQueue.add({ tweets: tweets.map((t) => t.toJSON()) });
    }
  }
}

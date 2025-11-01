import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class CurrencyService implements OnModuleInit {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly timeout = 10000; // 10 seconds timeout
  private readonly CACHE_KEY = 'currency_rates';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async onModuleInit() {
    this.logger.log('Initializing currency service, fetching initial rates...');
    await this.fetchAndCacheRates();
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async handleCron() {
    this.logger.log('Running scheduled currency rates fetch...');
    await this.fetchAndCacheRates();
  }

  private async fetchAndCacheRates() {
    try {
      const rates = await this.parseAllSources();
      await this.cacheManager.set(this.CACHE_KEY, rates);
      this.logger.log('Currency rates successfully cached');
    } catch (error) {
      this.logger.error('Failed to fetch and cache currency rates:', error.message);
    }
  }

  async getCachedRates() {
    const cachedRates = await this.cacheManager.get(this.CACHE_KEY);
    if (!cachedRates) {
      this.logger.warn('No cached rates found in Redis, fetching fresh data...');
      await this.fetchAndCacheRates();
      // Try to get from cache again
      const rates = await this.cacheManager.get(this.CACHE_KEY);
      return rates || { error: 'Failed to fetch and cache currency rates' };
    }
    return cachedRates;
  }

  async parseAllSources() {
    // Fetch all sources in parallel
    const [bog,
      tbc,
      pcb,
      nbg
    ] = await Promise.allSettled([
      this.parseBankOfGeorgia(),
      this.parseTBC(),
      this.parseProCredit(),
      this.parseNBG(),
    ]);

    return {
      bog: bog.status === 'fulfilled' ? bog.value : { error: bog.reason?.message || 'Failed to fetch Bank of Georgia data' },
      tbc: tbc.status === 'fulfilled' ? tbc.value : { error: tbc.reason?.message || 'Failed to fetch TBC Bank data' },
      pcb: pcb.status === 'fulfilled' ? pcb.value : { error: pcb.reason?.message || 'Failed to fetch ProCredit Bank data' },
      nbg: nbg.status === 'fulfilled' ? nbg.value : { error: nbg.reason?.message || 'Failed to fetch NBG data' },
    };
  }

  private async parseBankOfGeorgia() {
    try {
      const { data } = await axios.get('https://bankofgeorgia.ge/api/currencies/200', {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const result: any = {};

      // Parse the API response - response structure: { data: [ { ccy: "USD", buyRate: 2.66, sellRate: 2.76, ... } ] }
      const currencies = data?.data || data;

      if (Array.isArray(currencies)) {
        currencies.forEach((currency: any) => {
          if (currency.ccy === 'USD') {
            result.USD = {
              buy: currency.buyRate,
              sell: currency.sellRate,
              dgtlBuy: currency.dgtlBuyRate,
              dgtlSell: currency.dgtlSellRate,
              currentRate: currency.currentRate,
              name: currency.name,
            };
          }

          if (currency.ccy === 'EUR') {
            result.EUR = {
              buy: currency.buyRate,
              sell: currency.sellRate,
              dgtlBuy: currency.dgtlBuyRate,
              dgtlSell: currency.dgtlSellRate,
              currentRate: currency.currentRate,
              name: currency.name,
            };
          }
        });
      }

      if (!result.USD && !result.EUR) {
        this.logger.error('Bank of Georgia API response structure:', JSON.stringify(data));
        throw new Error('Could not find USD or EUR rates in API response');
      }

      return result;
    } catch (error) {
      this.logger.error(`Bank of Georgia parsing error: ${error.message}`);
      throw error;
    }
  }

  private async parseTBC() {
    try {
      const { data } = await axios.get(
        'https://apigw.tbcbank.ge/api/v1/exchangeRates/commercialList?locale=en-US',
        {
          timeout: this.timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
      );

      const result: any = {};

      // Parse the API response - response structure: { rates: [ { iso: "USD", buyRate: 2.666, ... } ] }
      const rates = data?.rates || data;

      if (Array.isArray(rates)) {
        rates.forEach((currency: any) => {
          if (currency.iso === 'USD') {
            result.USD = {
              buy: currency.buyRate,
              sell: currency.sellRate,
              officialCourse: currency.officialCourse,
              diff: currency.diff,
              name: currency.name,
            };
          }

          if (currency.iso === 'EUR') {
            result.EUR = {
              buy: currency.buyRate,
              sell: currency.sellRate,
              officialCourse: currency.officialCourse,
              diff: currency.diff,
              name: currency.name,
            };
          }
        });
      }

      if (!result.USD && !result.EUR) {
        this.logger.error('TBC Bank API response structure:', JSON.stringify(data));
        throw new Error('Could not find USD or EUR rates in API response');
      }

      return result;
    } catch (error) {
      this.logger.error(`TBC Bank parsing error: ${error.message}`);
      throw error;
    }
  }

  private async parseProCredit() {
    try {
      const { data } = await axios.get('https://procreditbank.ge/en/exchange', {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(data);
      const result: any = {};

      // Look for exchange-block and parse exchange-item articles
      $('.exchange-block .exchange-item').each((_, item) => {
        const $item = $(item);

        // Check the image source to determine currency
        const imgSrc = $item.find('.exchange-img img').attr('src') || '';
        const buyRate = $item.find('.exchange-buy').text().trim();
        const sellRate = $item.find('.exchange-sell').text().trim();

        // USD is identified by "usa" in the image name
        if (imgSrc.includes('usa') && !result.USD) {
          result.USD = {
            buy: parseFloat(buyRate),
            sell: parseFloat(sellRate),
          };
        }

        // EUR is identified by "euro" in the image name
        if (imgSrc.includes('euro') && !result.EUR) {
          result.EUR = {
            buy: parseFloat(buyRate),
            sell: parseFloat(sellRate),
          };
        }
      });

      if (!result.USD && !result.EUR) {
        this.logger.error('ProCredit Bank HTML structure:', $('.exchange-block').html());
        throw new Error('Could not find USD or EUR rates');
      }

      return result;
    } catch (error) {
      this.logger.error(`ProCredit Bank parsing error: ${error.message}`);
      throw error;
    }
  }

  private async parseNBG() {
    try {
      const { data } = await axios.get(
        'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/ka/json',
        {
          timeout: this.timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
      );

      const result: any = {};

      // NBG returns an array of currencies
      if (Array.isArray(data) && data.length > 0) {
        // Find USD and EUR in the array
        const currencies = data[0]?.currencies || data;

        if (Array.isArray(currencies)) {
          currencies.forEach((currency: any) => {
            if (currency.code === 'USD') {
              result.USD = {
                rate: currency.rate,
                quantity: currency.quantity,
                ratePerUnit: currency.ratePerUnit || (currency.rate / currency.quantity),
              };
            }
            if (currency.code === 'EUR') {
              result.EUR = {
                rate: currency.rate,
                quantity: currency.quantity,
                ratePerUnit: currency.ratePerUnit || (currency.rate / currency.quantity),
              };
            }
          });
        }
      }

      if (!result.USD && !result.EUR) {
        // If we can't find structured data, return the raw response
        return data;
      }

      return result;
    } catch (error) {
      this.logger.error(`NBG API parsing error: ${error.message}`);
      throw error;
    }
  }
}

const NodeCache = require('node-cache');
import axios from 'axios';
import { allFoundObj } from '../types';
type Object = {
  [key: string]: any;
};

const myCache = new NodeCache({ stdTTL: 0 });
const db = require('../db/db-connect');
const currentLife = 60 * 30;

// queries
const queries: Object = {
  baseline: `https://api.inaturalist.org/v1/observations/species_counts?place_id=122840&month=${process.env.BASELINE_MONTH}&per_page=1000`,
  current: `https://api.inaturalist.org/v1/observations/species_counts?place_id=122840&d1=${process.env.CURRENT_D1}&d2=${process.env.CURRENT_D2}&per_page=500`,
};

// make query function
const makeQuery = async (type: string) => {
  console.log('entered makequery');
  const getNextPage: Function = async (page = 1, fullResult: Object[] = []) => {
    // make query
    const result = await axios.get(`${queries[type]}&page=${page}`);

    // show progress
    console.log('total results: ', result.data.total_results);
    console.log('page: ', page);

    // update array
    fullResult.push(
      ...result.data.results.map((el: Object) => {
        return {
          name: el.taxon.preferred_common_name,
          scientificname: el.taxon.name,
          count: el.count,
          taxaId: String(el.taxon.id),
          pictureurl: el.taxon.default_photo
            ? el.taxon.default_photo.medium_url
            : null,
          taxon: el.taxon.iconic_taxon_name,
          found: false,
        };
      })
    );
    console.log('full length: ', fullResult.length);

    // recurse if there's more, else return array
    if (result.data.total_results > result.data.per_page * page) {
      return getNextPage(page + 1, fullResult);
    } else {
      return fullResult;
    }
  };
  const parsedResults = await getNextPage();
  return parsedResults;
};

// check cache function
const checkCache = async (key: string) => {
  console.log(myCache.keys());
  // check for string in cache
  const keyVal = myCache.get(key);
  let returnVal;
  // if in cache, return value
  if (keyVal) {
    console.log(key, 'already in cache!');

    returnVal = keyVal;
  }
  // if not in cache, set value and return that
  else {
    console.log(key, 'not in cache. about to create a key');

    let lifeTime;

    if (key === 'baseline') {
      returnVal = await db.query('select * from baseline;');
      returnVal = returnVal.rows;
      lifeTime = undefined;
    }
    if (key === 'current') {
      returnVal = await makeQuery(key);
      lifeTime = currentLife;
    }
    myCache.set(key, returnVal, lifeTime); // 3 mins
  }
  // get time left on current's cache
  let timeOfExpiry = myCache.getTtl('current');
  const timeRemaining = (timeOfExpiry - +new Date()) / 1000;

  return { returnVal, timeRemaining };
};

const getLiveUpdates = async () => {
  // return contents of cache
  let result: allFoundObj;
  let updatesObj: allFoundObj | undefined = myCache.get('liveUpdates');
  result = updatesObj ? updatesObj : {};
  return result;
};
const addLiveUpdate = async (speciesObj: allFoundObj) => {
  console.log('adding live update');
  // get cache obj
  const updatesObj: allFoundObj = await getLiveUpdates();
  // update cache obj with new data
  const newUpdatesObj: allFoundObj = { ...updatesObj, ...speciesObj };
  // updatesObj[speciesObj.taxaId] = speciesObj;
  console.log('about to set key', 'liveUpdates', updatesObj);
  // set key, no expiration
  myCache.set('liveUpdates', newUpdatesObj);
  console.log(myCache.get('liveUpdates'));
};

myCache.on('expired', (key: string, value: any) => {
  value = myCache.del('liveUpdates');
  console.log(key, ' expired! ', new Date().toLocaleString());
  // manually clear the cache for live updates
});

module.exports = { checkCache, makeQuery, addLiveUpdate, getLiveUpdates };

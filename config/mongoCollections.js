import {dbConnection} from './mongoConnection.js';

const getCollectionFn = (collection) => {
  let _col = undefined;

  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = await db.collection(collection);
    }

    return _col;
  };
};


export const users = getCollectionFn('users');
export const faculty = getCollectionFn('faculty');
export const courses = getCollectionFn('courses');
export const comments = getCollectionFn('comments'); 

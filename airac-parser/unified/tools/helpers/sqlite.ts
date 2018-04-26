import * as sqlite3 from 'sqlite3';

export const query = <T = any>(
  db: sqlite3.Database,
  queryStr: string
): Promise<T> => {
  return new Promise((resolve, reject) => {
    db.get(queryStr, (err, rows) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const all = <T = any>(
  db: sqlite3.Database,
  queryStr: string
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(queryStr, (err, rows) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

import archiver from 'archiver';
import { createWriteStream } from 'fs-extra'

export const zipDirectory = (source: string, out: string): Promise<any> => {
  const archive = archiver('zip', { zlib: { level: 9 }});
  const stream = createWriteStream(out);

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on('error', err => reject(err))
      .pipe(stream)
    ;

    stream.on('close', () => resolve());
    archive.finalize();
  });
}

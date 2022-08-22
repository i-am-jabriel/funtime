import glob from 'glob';
import fs from 'fs';
import {confirm} from './utils.js';
import mkdirp from 'mkdirp';
const dir = process.argv[2];

confirm('Are you sure you want to trim image files in '+ dir)
  .then(res => {
    if(!res) return;
    console.log('starting trim deleting large photoshop files');
    glob(`${dir}/**/*.psd`, {}, function (er, files) {
      files.forEach(file => fs.unlinkSync(file));
    });

    console.log('finished, removing background images');
    glob(`${dir}/**/*(2 )*background/**/*.*`, {nocase: true}, function (er, files) {
      files.forEach(file => fs.unlinkSync(file));
    });

    console.log('finished, starting moving animated files');

    // glob(`${dir}/**/*objects_animated|(4 )*animated objects/*.png`, {nocase: true}, function (er, files) {
    glob(`${dir}/**/*(4 )*animated objects/*.png`, {nocase: true}, function (er, files) {
      files.forEach(async file => {
        const newDir = file.replace('tiles', 'objects').replace(/\/objects_animated|(4 )*animated objects\//i, '');
        await mkdirp(newDir.slice(0, newDir.lastIndexOf('/')))
        fs.renameSync(file, newDir);
      });
    });

    console.log('finished deleting tilesets');
    glob(`${dir}/**/*Tileset.png`, {nocase: true}, function (er, files) {
      files.forEach(async file => fs.unlinkSync(file));
    });

    console.log('complete');
  })
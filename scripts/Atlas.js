import { context, camelCaser } from "./helper.js";

export class Atlas {
  static atlases = {};
  images = {};

  
  fetchJsonAddImages(jsonUrl, img, formatter){
    return fetch(jsonUrl)
      .then(res => res.json())
      .then(json => this.addImagesFromJson(json, img, formatter));

  }
  add(type, atlasImage){
      this.images[type] = atlasImage;
  }
  addImagesFromJson(json, img, formatter = camelCaser){
    // Object.values(json).forEach(image => {
      // this.addImage(new AtlasImage())
    console.log(json);
      this.addImages(Object.keys(json.frames)
          .reduce((a, c) => a.setProp((formatter ? formatter(c) : c).replace(/\..{3,4}$/, ''), new AtlasImage(json.frames[c].frame.x + 1, json.frames[c].frame.y + 1, json.frames[c].frame.w, json.frames[c].frame.h).setProp('img', img)), {}));
  // });
    console.log(this.images);
    return this;
  }
  addImages(images){
      Object.assign(this.images, images);
  }
  get(type){ 
      return this.images[type]; 
  }
  addImagesFromSpriteSheet(image, rows, cols, pre = '', post = ''){
      if(!context) return;
      if(!image){
          console.warn('invalid image to add to atlas');
          return
      }
      let width = image.width / rows, height = image.height / cols;
      for(let y = 0; y < cols; y++){
          for(let x = 0; x < rows; x++){
              this.images[`${pre}${x + y * rows}${post}`] = new AtlasImage(x * width, y * height, width, height);
          }
      }
  }
  addImagesFromSpriteSheetSection(rect, rows, cols, pre = '', post = '', img){
      for(let y = 0; y < cols; y++){
          for(let x = 0; x < rows; x++){
              this.images[`${pre}${x + y * rows}${post}`] = new AtlasImage(rect.x + x * rect.w, rect.y + y * rect.h, rect.w, rect.h, 0, 0, img);
          }
      }
  }
  createGenericAnimations(){
      return Object.keys(this.images).reduce((a, key)=>({...a, [key]:[key]}),{})
  }
}
//Data holder for a frame on a sprite sheet
export class AtlasImage{
  constructor(x, y, width, height, ox = 0, oy = 0, img){
    console.log('bingo');
    Object.assign(this, {x, y, width, height, ox, oy, img});
  }
  values(){
    return [this.x, this.y, this.width, this.height]
  }
}
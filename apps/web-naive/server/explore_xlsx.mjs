import AdmZip from 'adm-zip';
import fs from 'fs';
const zip = new AdmZip('../public/gh.xlsx');

const cellImagesXml = zip.readAsText('xl/cellimages.xml');
const cellImagesRels = zip.readAsText('xl/_rels/cellimages.xml.rels');

fs.writeFileSync('../public/cellimages.xml', cellImagesXml, 'utf-8');
fs.writeFileSync('../public/cellimages_rels.xml', cellImagesRels, 'utf-8');

const imageEntry = zip.getEntry('xl/media/image1.jpeg');
if (imageEntry) {
  const imageData = imageEntry.getData();
  fs.writeFileSync('../public/image1_sample.jpeg', imageData);
  console.log('Image size:', imageData.length, 'bytes');
}

console.log('Done - check cellimages.xml and cellimages_rels.xml');

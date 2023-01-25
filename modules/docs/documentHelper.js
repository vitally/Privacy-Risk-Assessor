import Docxtemplater  from 'docxtemplater';
import PizZip from 'pizzip';

import fs from 'fs';

export { DocumentHelper };

class DocumentHelper {

  static createComplaintDoc(data) {
    
    const template = fs.readFileSync('./modules/docs/dviTemplate.docx', 'binary');
    const zippedTemplate = new PizZip(template);
    const docx = new Docxtemplater(zippedTemplate,{
      paragraphLoop: true,
      linebreaks: true
    });

    docx.render(data);

    return docx.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });
  }

}
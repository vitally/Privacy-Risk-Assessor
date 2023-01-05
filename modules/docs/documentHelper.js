import { createReport } from 'docx-templates';
import fs from 'fs';

export { DocumentHelper };

class DocumentHelper {

  static async createComplaintDoc(data) {
    const template = fs.readFileSync('./modules/docs/dviTemplate.docx');
    return await createReport({
      template,
      data: data,
    });
  }

}
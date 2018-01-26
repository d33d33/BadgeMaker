var  PdfDoc = require('pdfkit'),
    parse = require('csv-parse'),
    QRCode = require('qrcode');

const {promisify} = require('util');    
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);


    process.on('unhandledRejection', (err) => { 
        console.error(err)
        process.exit(1)
      });

var outDir = './BADGES';
var inDir = './csv';

fs.readdir(inDir, (err, files) => {
    if (err) {
        throw err;
    }

    files.forEach((filename) => { 
        if (!filename.endsWith('.csv')) {
            return;
        }
        var outFile = outDir + '/' + filename.substr(0, filename.length - 4) + '.pdf';
        console.info('Processing ' + filename + ' -> ' + outFile);

        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir);
        }

        fs.readFile(inDir + '/' + filename,  (err, str) => {
            if (err) {
                throw err;
            }

            parse(str, { columns: true }, async (err, data) => {
                //console.log(data);

                var doc = new PdfDoc({
                    size: 'A4', /*595.28, 841.89*/
                    margin: 0
                }),
                    cardHeight = doc.page.height / 4,
                    margin = 16;

                doc.pipe(fs.createWriteStream(outFile));
                doc.font('fonts/Roboto-Regular.ttf');

                let index = -1;
                for (let person of data) {
                    index++;
                    var byPage = 4,
                        i = index % byPage;

                    if (i == 0) {
                        if (index != 0) {
                            doc.addPage();
                        }

                        doc.rect(doc.page.width / 2, 0, 0, doc.page.height).stroke();

                        for (var x = 0; x < byPage; x++) {
                            doc.rect(0, x * cardHeight, doc.page.width, 0).stroke();
                        }
                    }

                    if (i < 2) {
                        doc.rotate(-90)
                            .image('img/cantine.png', -cardHeight * i - 80 - margin, 210, { width: 80 })
                            .image('img/bubbles.png', -cardHeight * (i + 1) + 5, doc.page.width / 2 - 105, { height: 100 })
                            .rotate(90);
                    }
                    else {
                        doc.rotate(-90)
                            .image('img/cantine.png', -cardHeight * (i + 1) + margin, 210, { width: 80 })
                            .image('img/bubblesR.png', -cardHeight * i - 112, doc.page.width / 2 - 105, { height: 100 })
                            .rotate(90);
                    }


                    var capitalizeEach = function (str) {
                        var tmp = str.toLowerCase();
                        tmp = tmp.split(' ');
                        var ret = '';
                        tmp.forEach((part) => {
                            if (part) {
                                ret += part[0].toUpperCase() + part.substring(1) + ' ';
                            }
                        });
                        return ret.slice(0, ret.length - 1);
                    };

                    var color = '',
                        offset = 0;
                    if (person['Statut'] === 'Mentor' || person['Statut'] === 'Facilitateur')
                        color = '#3aaa35'
                    else if (person['Statut'] === 'Minion')
                        color = '#e6007e'
                    else if (person['Statut'] === 'Jury')
                        color = '#ef7d00'
                    else if (person['Statut'] === 'Orga' || person['Statut'] === 'Infolab')
                        color = '#36a9e1'


                    if (color) {
                        offset = 30;

                        doc.rotate(-90)
                            .font('fonts/Roboto-Bold.ttf')
                            .fontSize(26)
                            .fillColor(color)
                            .text((person['Statut'] || '').toUpperCase(), -cardHeight * (i + 1) + margin, 95, {
                                width: cardHeight - 2 * margin,
                                align: 'center'
                            })
                            .fillColor('black')
                            .font('fonts/Roboto-Regular.ttf')
                            .rotate(90)
                    }

                    doc.rotate(-90)
                        .image('img/sw.png', -cardHeight * (i + 1) + margin, margin, { width: cardHeight - 2 * margin })
                        .fontSize(26)
                        .text(capitalizeEach(person['Prénom']), -cardHeight * (i + 1) + margin, 110 + offset, {
                            width: cardHeight - 2 * margin,
                            align: 'center',
                            continued: true
                        })
                        .fontSize(20)
                        .text('\n' + person['Nom'].toUpperCase(), {
                            align: 'center',
                            style: 'bold',
                            lineGap: 12
                        })
                        .rotate(90);


                    let personQrcode = await QRCode.toDataURL(`{"personId":${person['N° de participant']}}`);
                    
                    doc.rotate(90)
                        .image('img/sw_logo.jpg', cardHeight * i + 16 + 15, -570,
                        { width: cardHeight - 2 * margin - 30 }) // I need some free place for the barcode, so I reduce the image size...
                        .fontSize(14)
                        .text('En cas de problème joindre', cardHeight * i, -doc.page.width + margin + 10, {
                            width: cardHeight,
                            align: 'center'
                        })
                        .image('img/building.png', cardHeight * i + 16, -520, { width: 16 })
                        .text('Jessica : 06 18 76 28 15', cardHeight * i + 40, -520, {
                            width: cardHeight,
                            align: 'left'
                        })
                        .image('img/robot.png', cardHeight * i + 16, -490, { width: 16 })
                        .text('Horacio : 06 10 50 18 34', cardHeight * i + 40, -490, {
                            width: cardHeight,
                            align: 'left'
                        })
                        .image('img/safety.png', cardHeight * i + 16, -460, { width: 16 })
                        .text('Jennifer : 06 60 74 37 03', cardHeight * i + 40, -460, {
                            width: cardHeight,
                            align: 'left'
                        })
                        .font('fonts/font3of9.ttf').fontSize(34)
                        .text('*' + person['N° de participant'] + '*', cardHeight * i + 20, -360, {
                            width: cardHeight,
                            align: 'left'
                        })
                        .font('fonts/Roboto-Regular.ttf').fontSize(14)
                        .text(person['N° de participant'], cardHeight * i + 20 + 35, -335, {
                            width: cardHeight,
                            align: 'left'
                        })
                        .font('fonts/Roboto-Regular.ttf').fontSize(14)


                        .image(personQrcode, 
                            cardHeight * i + 110, -390, { width: 84 })

                        .rotate(-90);
                };
                doc.end();
            });
        });
    });
});
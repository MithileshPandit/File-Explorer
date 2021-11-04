const url = require('url');
const path = require('path');
const fs = require('fs');

const buildBreadcrumb = require('./breadcrumb.js');
const buildMainContent = require('./mainContent.js');
const getMimeType = require('./getMimeType.js');

const staticBasePath = path.join(__dirname, '..', 'static');


const respond = (request, response) => {

    let pathname = url.parse(request.url, true).pathname;

    if(pathname === '/favicon.ico'){
        return false;
    }

    pathname = decodeURIComponent(pathname);


    const fullStaticPath = path.join(staticBasePath, pathname);


    if(!fs.existsSync(fullStaticPath)){
        console.log(`${fullStaticPath} does not exist`);
        response.write('404: File not found!');
        response.end();
        return false;
    }

    let stats;
    try{
        stats = fs.lstatSync(fullStaticPath);
    }catch(err){
        console.log(`lstatSync Error: ${err}`);
    }


    //It is a directory:
    if(stats.isDirectory()){
        //get content from the template index.html
        let data = fs.readFileSync(path.join(staticBasePath, 'project_files/index.html'), 'utf-8');

        //build the page title
        console.log(pathname);
        let pathElements = pathname.split('/').reverse();
        pathElements = pathElements.filter(element => element !== '');
        let folderName = pathElements[0];
        if(folderName === undefined){
            folderName = 'Home';
        }
        console.log(folderName);

        const breadcrumb = buildBreadcrumb(pathname);

        const mainContent = buildMainContent(fullStaticPath, pathname);

        data = data.replace('page_title', folderName);
        data = data.replace('pathname', breadcrumb);
        data = data.replace('mainContent', mainContent);

        response.statusCode = 200;
        response.write(data);
        return response.end();
    }

    if(!stats.isFile()){
        response.statusCode = 401;
        response.write('401: Access denied!');
        console.log('not a file!');
        return response.end();
    }

    //It is a file
    //Let's get the file extension
    let fileDetails = {};
    fileDetails.extname = path.extname(fullStaticPath);
    console.log(fileDetails.extname);

    //file size
    let stat;
    try{
        stat = fs.statSync(fullStaticPath);
    }catch(err){
        console.log(`error: ${err}`);
    }
    fileDetails.size = stat.size;

    getMimeType(fileDetails.extname)
        .then(mime => {
        let head = {};
        let options = {};

        let statusCode = 200;

        head['Content-Type'] = mime;


        if(fileDetails.extname === '.pdf'){
            head['Content-Disposition'] = 'inline';
        }

        if(RegExp('audio').test(mime) || RegExp('video').test(mime)){
            //header
            head['Accept-Ranges'] = 'bytes';

            const range = request.headers.range;
            console.log(`range: ${range}`);
            if(range){

                const start_end = range.replace(/bytes=/, "").split('-');
                const start = parseInt(start_end[0]);
                const end = start_end[1]
                ? parseInt(start_end[1])
                : fileDetails.size - 1;
                

                head['Content-Range'] = `bytes ${start}-${end}/${fileDetails.size}`;
                head['Content-Length'] = end - start + 1;
                statusCode = 206;
                
                options = {start, end};
            }


        }

        const fileStream = fs.createReadStream(fullStaticPath, options);

        response.writeHead(statusCode, head);
        fileStream.pipe(response);


        fileStream.on('close', () => {
            return response.end();
        });
        fileStream.on('error', error => {
            console.log(error.code);
            response.statusCode = 404;
            response.write('404: FileStream error!');
            return response.end();
        });

    })
        .catch(err => {
        response.statusCode = 500;
        response.write('500: Internal server error!');
        console.log(`Promise error: ${err}`);
        return response.end();
    })

}

module.exports = respond;

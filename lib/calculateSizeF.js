
const calculateSizeF = stats => {
    
    const filesizeBytes = stats.size; //bytes

    const units = "BKMGT";


    const index = Math.floor(Math.log10(filesizeBytes)/3);


    const filesizeHuman = (filesizeBytes/Math.pow(1000,index)).toFixed(1);
    
    const unit = units[index];
   
    filesize = `${filesizeHuman}${unit}`;

    return [filesize, filesizeBytes];
};

module.exports = calculateSizeF;
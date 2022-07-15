const fs = require("fs");
const path = require("path");
const moment = require("moment");
let folderList = [];
let newArray = [];
let folderStructure = {};
let projectStats = [];
let totalRepoSize = 0;
let excludeTypes = /(mp3|mp4|mov|jpeg|png|jpg|jfif|gif|bmp|txt|svg|docx|md|html|sqlite|dng|pdf|js|gitattributes)/i;
let includeTypes = /(jpg|jpeg|gif|png)/i;
let defaultURL = "https://print2a.com";


//BEGIN FUNCTIONS
//finds files by Extension
function recFindByExt(base, ext, files, result) {
	files = files || fs.readdirSync(base);
	result = result || [];
	files.forEach(function(file) {
		let fileEXT = file.substring(file.lastIndexOf(".") + 1);
		var newbase = path.join(base, file);
		if (fs.statSync(newbase).isDirectory()) {
			result = recFindByExt(newbase, ext, fs.readdirSync(newbase), result);
		} else {
			if (ext.test(fileEXT)) {
				result.push(newbase);
			}
		}
	});
	return result;
}

//filters files by Extension
function recFilterByExt(base2, ext2, files2, result2) {
	files2 = files2 || fs.readdirSync(base2);
	result2 = result2 || [];
	files2.forEach(function(file2) {
		let fileEXT2 = file2.substring(file2.lastIndexOf(".") + 1);
		var newbase2 = path.join(base2, file2);
		if (fs.statSync(newbase2).isDirectory()) {
			result2 = recFilterByExt(newbase2, ext2, fs.readdirSync(newbase2), result2);
		} else {
			if (!ext2.test(fileEXT2)) {
				result2.push(newbase2);
			}
		}
	});
	return result2;
}

//makes array of files to get total size from
const getAllFiles = function(dirPath, arrayOfFiles) {
	files = fs.readdirSync(dirPath);
	arrayOfFiles = arrayOfFiles || [];
	files.forEach(function(file) {
		if (fs.statSync(dirPath + "/" + file).isDirectory()) {
			arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
		} else {
			arrayOfFiles.push(path.join(dirPath, file));
		}
	});
	return arrayOfFiles;
};

//converts bytes to readable format
const convertBytes = function(bytes) {
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes == 0) {
		return "n/a";
	}
	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	if (i == 0) {
		return bytes + " " + sizes[i];
	}
	return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
};

//get total size of files in folder
const getTotalSize = function(directoryPath) {
	const arrayOfFiles = getAllFiles(directoryPath);
	let totalSize = 0;
	arrayOfFiles.forEach(function(filePath) {
		totalSize += fs.statSync(filePath).size;
	});
	totalRepoSize += totalSize;
	return convertBytes(totalSize);
};

function createFolderStats(folderList){
	for (h in folderList) {
		let folderArray = fs.readdirSync(folderList[h]);
		folderArray = folderArray.map(g => folderList[h] + "/" + g);
		for (l in folderArray) {
			if (!folderList.includes(folderArray[l])){
				//console.log(folderArray[l]);
				let folderStats = fs.statSync(folderArray[l]);
				let folderSize = getTotalSize(folderArray[l]);
				let folderTime = folderStats.mtimeMs;
				let folderParents = folderArray[l].substring(0, folderArray[l].lastIndexOf("/"));
				let folderName = folderArray[l].substring(folderArray[l].lastIndexOf("/") + 1).replace(/_/g, " ");
				let folderTags = folderParents.split("/").concat(folderName.split(" "));
				let folderImages = recFindByExt(folderArray[l], includeTypes);
				let folderSTL = recFindByExt(folderArray[l], /(stl)/i);
				let folderSTP = recFindByExt(folderArray[l], /(stp|step)/i);
				let folderDocs = recFindByExt(folderArray[l], /(txt|pdf|docx|html|doc|odt|rtf|xls|ppt|ods)/i);
				let displayImage = "Default-IMG-URL";
				if (folderImages[0]) {
					displayImage = [];
					for (m in folderImages){
						displayImage.push(folderImages[m].replace(/\\/g, "/"))
					}
				}
				projectStats.push(
					{
						Name: folderName,
						Size: folderSize,
						Folder: folderParents,
						Tags: folderTags,
						Docs: folderDocs.length,
						Images: folderImages.length,
						STL: folderSTL.length,
						STEP: folderSTP.length,
						DisplayImage: displayImage,
						Created: folderTime,
						FullPath: folderArray[l]
					}
				)
			}
		}
	}
}

function getDaysAgoData(ar, da) {
  let t = new Date();
  let d = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate() - da));
  return ar.filter(i => new Date(i.Created) >= d).sort((a, b) => a.Created.toString().localeCompare(b.Created.toString()));
}

function getLatestProjects(array){
	let newArray = [];
	array = getDaysAgoData(array,30);
	array.sort(function(a,b){
	  return new Date(b.Created) - new Date(a.Created);
	})
	for (let i in array) {
		let projectPath = array[i].FullPath.replace("/mnt/volume_sfo2_01/repo/print2a/","")
		let projectTags = projectPath.split("/");
		newArray.push({
			title: array[i].Name,
			created: new Date(array[i].Created),
			tags: projectTags,
			docs: array[i].Docs,
			stl: array[i].STL,
			stp: array[i].STEP,
			pics: array[i].Images,
			size: array[i].Size,
			link: `${defaultURL}/browse?folder=${projectPath}`
		})
	}
	return newArray
}

//creates json data of folder structure
function createFolderStructure(array) {
	let result = [];
	let level = {result};
	array.forEach(path => {
  path.split('/').reduce((r, name, i, a) => {
    if(!r[name]) {
      r[name] = {result: []};
      r.result.push({[name]:r[name].result})
    }
    return r[name];
  }, level)
})
folderStructure = result;
}
//END FUNCTIONS


//BEGIN RUN
//read folders to scan from file
folderList = fs.readFileSync("folders.txt").toString().split("\n");

//make Folder Structure to integrate folder stats
createFolderStructure(folderList);

//make folder stats to integrate with folder structure
createFolderStats(folderList);

let totalProjectFiles = recFilterByExt("/mnt/volume_sfo2_01/repo/print2a", excludeTypes).length;
let totalFiles = recFilterByExt("/mnt/volume_sfo2_01/repo/print2a", /(gitattributes)/i).length;
let totalFolders = projectStats.length;
let totalRepoSizeReadable = convertBytes(totalRepoSize);

let latestProjectsJSON = getLatestProjects(projectStats);

latestProjectsJSON.unshift({
	title: 'Latest Repo Statistics',
	tags: `Total Projects: ${totalFolders}\nProject Files: ${totalProjectFiles}\nTotal Files: ${totalFiles}\nTotal Repo Size: ${totalRepoSizeReadable}`,
	link: `#`
})

let latestProjects = JSON.stringify(latestProjectsJSON)
fs.writeFileSync("latest.json", latestProjects)

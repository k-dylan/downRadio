

var querystring = require('querystring'); 
var request = require('request');
var fs = require('fs');
var later = require('later');
var ProgressBar = require('progress');

var terminalTypeCbb = 515104503;
var radioDir = "./src/"; // 音频存储位置
var hour = 23; // 定时执行 小时
var minute = 30; // 定时执行 分钟


// 初始化目录，如果存储位置文件夹不存在，则创建
function init () {
	if(!fs.existsSync(radioDir)) {
		fs.mkdirSync(radioDir);
	}
}


// 组合json数据连接
function getDataUrl() {
	var url = 'http://bk2.radio.cn/mms4/videoPlay/getMorePrograms.jspa';
	var data = {
		programName : "%E6%96%B0%E9%97%BB%E5%92%8C%E6%8A%A5%E7%BA%B8%E6%91%98%E8%A6%81",
		start : 0,
		limit : 2,
		channelId : 14,
		callback : "getList",
		_ : Math.random()
	};
	var query = querystring.stringify(data);
	return url + "?" + query;
}	
// 返回json对象
// json数据连接是jsonp,所以使用这个函数解析；
function getList (obj) {
	return obj;
}
// 根据programId组合radio下载地址
function getRadioUrl (programId) {
	var url="http://bk2.radio.cn/mms4/videoPlay/getVodProgramPlayUrlJson.jspa?programId="+programId+"&programVideoId=0&videoType=PC&terminalType="+terminalTypeCbb+"&dflag=1";//new
	return url;
}
// 获取下载连接
function getDownSrc(item, callback) {
	request(getRadioUrl(item.programId), function (err, res, body) {
		if(err) 
			callback(err);
		
		var match = body.match(/title\>(.*?)\</);
		if(!match) {
			callback({msg: "没有找到下载地址！"});
		}
		var radioSrc = match[1];
		
		callback(null, radioSrc);
	});
}

// 下载radio
function downRadio() {
	init();
	console.log('读取数据列表');
	request(getDataUrl() ,{timeout: 5000 },function (err, res, body) {
		if(err){
			if(err.code == 'ETIMEDOUT'){
				console.error('连接超时，重试')
				return downRadio();				
			}
			return console.error(err);			
		}

		var radiolist = eval(body);
		
		var item = radiolist.programs[0];
		console.log('找到最新的音频：' + item.programName);
		console.log('开始获取此音频的下载地址！');
		// 获取下载连接
		getDownSrc(item, function (err,src) {
			if(err)
				return console.log(err.msg);
			console.log('已经找到下载地址为：'+ src);
			// 下载Radio
			request.get(src)
				.on('response', function (response) {
					if(response.statusCode != 200)
						return false; // 连接 失败
					console.log('连接成功，开始下载！');
					
					var contentLength = parseInt(response.headers['content-length'], 10);
					var stream = fs.createWriteStream(radioDir + item.programName + ".m4a");
					var currentLength = 0;
					
					// 进度显示
					var bar = new ProgressBar('正在下载： [:bar] :percent 剩余时间：:etas', {
						complete: '=',
						incomplete: ' ',
						width: 20,
						total: contentLength	
						})
					response.on('data', function (chunk) {
						stream.write(chunk);
						bar.tick(chunk.length);
						// console.log('已下载：' + Math.floor(currentLength * 100 / contentLength) + '%')	
					})
					
					response.on('end', function () {
						stream.end();
						console.log('下载完成！');
					})
				})
				// .pipe(fs.createWriteStream(radioDir + item.programName + ".m4a"));
		})
	})
}


downRadio();

later.date.localTime();
// 定时任务
var basic = [{h: [hour], m: [minute]}];

var sched = {
	schedules : basic
};

var t = later.setInterval(function() {
        downRadio();
    }, sched);




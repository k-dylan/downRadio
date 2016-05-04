var querystring = require('querystring');
var request = require('request');
var fs = require('fs');
var later = require('later');
var ProgressBar = require('progress');

var terminalTypeCbb = 515104503;
var radioDir = "./src/"; // 音频存储位置
var hour = 23; // 定时执行 小时
var minute = 30; // 定时执行 分钟



function DownRadio (radioDir, terminalTypeCbb) {
    this.radioDir = radioDir || './src/';
    this.terminalTypeCbb = terminalTypeCbb || 515104503;
    
    this.init();
}
/**
 * 初始化
 */
DownRadio.prototype.init = function () {
    if (!fs.existsSync(this.radioDir)) {
        fs.mkdirSync(this.radioDir);
    }
}

/**
 * 获取json数据连接url
 */
DownRadio.prototype.getDataUrl = function () {
    var url = 'http://bk2.radio.cn/mms4/videoPlay/getMorePrograms.jspa';
    var data = {
        programName: "%E6%96%B0%E9%97%BB%E5%92%8C%E6%8A%A5%E7%BA%B8%E6%91%98%E8%A6%81",
        start: 0,
        limit: 2,
        channelId: 14,
        callback: "getList",
        _: Math.random()
    };
    var query = querystring.stringify(data);
    return url + "?" + query;
}

/**
 * 根据programId组合radio下载地址 
 **/ 
DownRadio.prototype.getRadioUrl = function (programId) {
    var url = "http://bk2.radio.cn/mms4/videoPlay/getVodProgramPlayUrlJson.jspa?programId=" + programId + "&programVideoId=0&videoType=PC&terminalType=" + terminalTypeCbb + "&dflag=1";//new
    return url;
}


/**
 * 获取下载连接
 */
DownRadio.prototype.getDownSrc = function (item) {
    var self = this;
    request(self.getRadioUrl(item.programId), function (err, res, body) {
        if(err)
            return console.error(err);

        var match = body.match(/title\>(.*?)\</);
        if (!match) {
            callback({ msg: "没有找到下载地址！" });
        }
        var radioSrc = match[1];
        
        console.log('已经找到下载地址为：' + radioSrc);
        
        self.down(radioSrc, item);
    });
}

/**
 * 开始运行
 */
DownRadio.prototype.run = function () {
    var self = this;
    console.log('开始读取列表');
    
    request(this.getDataUrl(), {
        timeout: 5000
    }, function (err,res,body) {
        if(err){
            if(err.code == 'ETIMEDOUT') {
                console.error('连接超时，重试');
                return this.run();
            }
            return console.log(err);
        }
        
        var radiolist = eval(body);
        var item = radiolist.programs[0];
        
        console.log('找到最新的音频：' + item.programName);
        console.log('开始获取此音频的下载地址！');
        
        self.getDownSrc(item);
    })
}
/**
 * 下载数据
 */
DownRadio.prototype.down = function (src,item) {
    var self = this;
    request.get(src)
        .on('response', function (response) {
            if (response.statusCode != 200)
                return false; // 连接 失败
                
            console.log('连接成功，开始下载！');

            var contentLength = parseInt(response.headers['content-length'], 10);
            
            var stream = fs.createWriteStream(self.radioDir + item.programName + ".m4a");

            // 进度显示
            var bar = new ProgressBar('正在下载： [:bar] :percent 剩余时间：:etas', {
                complete: '=',
                incomplete: ' ',
                width: 30,
                total: contentLength
            });
            
            // 接收数据
            response.on('data', function (chunk) {
                stream.write(chunk);
                bar.tick(chunk.length);
            })
            // 数据接收完毕
            response.on('end', function () {
                stream.end();
                console.log('下载完成！');
            })
        });
}


// 返回json对象
// json数据连接是jsonp,所以使用这个函数解析；
function getList(obj) {
	return obj;
}


var downRadio = new DownRadio(radioDir, terminalTypeCbb);

// downRadio.run();


later.date.localTime();
// 定时任务
var basic = [{ h: [hour], m: [minute] }];

var sched = {
    schedules: basic
};

var t = later.setInterval(function () {
    downRadio.run();
}, sched);




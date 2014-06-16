//------------------------------------------------------------
//------------------------------------------------------------
var Byte = require('./Byte')
  , SYNC = 0xA0
  , ENDS = 0xAF
  , isFn =function(o) { return !!(o && o.constructor && o.call && o.apply);},
  logger        = require("../include/logger")

;


//------------------------------------------------------------
function ifDef(x, def) {
    if ( typeof(x) === 'undefined' ) {
        return def;
    } else {
        return x;
    }
}


//------------------------------------------------------------
function updateChecksum(bytes) {
    var sum = 0x00;

    for (var pos = 1 ; pos < 9 ; pos++ ) {
        sum += bytes[pos];
    }
    
    bytes[10] = (~(sum & 0xff) )& 0xff;

    return bytes;
}


//------------------------------------------------------------
function SamsungT(addr, stream) {
    this.stream = stream;
    this.bytes = [
        SYNC
      , 0x01
      , ifDef(addr, 0x01)
      , 0xE0
      , 0x00
      , 0x00
      , 0x00
      , 0x00
      , 0x00
      , ENDS
      , 0x00
    ];
    return this;
}
SamsungT.prototype.CallPT = function(p,t)
{
	this.bytes[4] = 0x04;
	this.bytes[5] = (p/256) & 0xff;
	this.bytes[6] = p & 0xff;
	this.bytes[7] = (t/256) & 0xff;
	this.bytes[8] = t & 0xff;

	updateChecksum(this.bytes);

	logger.log(1,this.bytes);
	this.stream.write(this.bytes);
}
SamsungT.prototype.CallZoom = function(z)
{
	this.bytes[4] = 0x07;
	this.bytes[5] = (z/256) & 0xff;
	this.bytes[6] = z & 0xff;
	this.bytes[7] = 0xFF;
	this.bytes[8] = 0x00;

	updateChecksum(this.bytes);

	logger.log(1,this.bytes);
	this.stream.write(this.bytes);
}



SamsungT.prototype.go = function(cb) {
    var dbl_write = true
      , dbl_intv = 30
      , self = this
    ;

    if (dbl_write) {
        self.go_once(function(){
            setTimeout(self.go_once.bind(self, cb), dbl_intv);
        });
    } else {
        self.go_once(cb);
    }
    return this;
};


SamsungT.prototype.go_once = function(cb) {
    var out = this.stream
      , self = this;
    

    if (!this.stream) {
        isFn(cb) && cb();
        return this;
    }

    var buf = this.get();

    var _cb = function(err, res) {
        return isFn(cb) && cb(err, res);
    };

    out.once('error', _cb.bind(_cb) );

    if ( out.write(buf) === false ) {
        out.once('drain', _cb.bind(_cb, null, buf) );
    } else {
        _cb(null, buf);
    }

    return this;
};

SamsungT.prototype.setPreset = function(nr) {
    if (nr < 0x01 || nr > 0x20)
      throw new Error('Preset number out of bounds [0x01..0x20]');

    this.bytes[2] = 0x00;
    this.bytes[3] = 0x03;
    this.bytes[4] = 0x00;
    this.bytes[5] = nr;

    return this;
};

module.exports = SamsungT;

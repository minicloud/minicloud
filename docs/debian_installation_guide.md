# Quick Start

minicloud based on node.js, providing efficient hybrid cloud file storage server.

all files are stored on your own server and original file stored.

support for image thumbnails,browse the document online(include doc/docx/xls/xlsx/ppt/pptx/pdf),video online play(include 3gp/avi/mp4 etc.)

The following describes how to install minicloud in ubuntu.

we tested through the debian 7.5 64bit.


# Basic installation dependent
```bash 
apt-get install -y  unzip
```
# Dependent libraries installation image thumbnail

```bash
apt-get install imagemagick --fix-missing -y
```

# Installation documentation online Browsing dependent libraries
```bash 
apt-get install -y libreoffice libreoffice-l10n-zh-cn
apt-get install -y ghostscript 
```

# Installation video online play dependent libraries
```bash
wget 'http://download.videolan.org/pub/x264/snapshots/last_x264.tar.bz2'
tar xjvf last_x264.tar.bz2 
cd x264-snapshot-20160613-2245 #（warning：the directory name may not same as this guide）
export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH
./configure  --disable-asm --enable-static --enable-shared 
make
make install
ldconfig
wget 'https://github.com/FFmpeg/FFmpeg/archive/master.zip'
unzip master.zip
cd FFmpeg-master
echo "/usr/local/lib" >> /etc/ld.so.conf
ldconfig
./configure --disable-yasm --enable-gpl --enable-libx264
make
make install
cd ..
rm FFmpeg-master -rf
rm master.zip -rf
```

# Installation Nodejs 

__Note__:If debian system is 32-bit, please download nodejs 32-bit installation package

```bash
wget 'https://nodejs.org/dist/v6.2.1/node-v6.2.1-linux-x64.tar.xz'
xz -d node-v6.2.1-linux-x64.tar.xz
tar -xf node-v6.2.1-linux-x64.tar
mkdir /usr/local/minicloud
mv node-v6.2.1-linux-x64 /usr/local/minicloud
rm -rf node-v6.2.1-linux-x64.tar
ln -s /usr/local/minicloud/node-v6.2.1-linux-x64/bin/node /usr/bin/node
```

# Installation minicloud

```bash
cd /usr/local/minicloud
wget 'https://github.com/minicloud/minicloud/archive/master.zip'
unzip master.zip
cd minicloud-master
/usr/local/minicloud/node-v6.2.1-linux-x64/bin/npm install
rm -rf /usr/local/minicloud/master.zip
```

# Firewall open port

__Note__:minicloud rely on the default port 6081.Please configure the firewall manually.

# Run minicloud
```bash
cd /usr/local/minicloud/minicloud-master/
/usr/local/minicloud/node-v6.2.1-linux-x64/bin/node ./index.js &
```

# Verify

In the browser to access https://xxx:6081, confirm the contents of the output is correct. xxx is the ip address of the server.

# Other

__Note__:中文文档浏览出现乱码问题，请按下面方式增加字库
```bash
apt-get install  ttf-wqy-zenhei -y 
```

Installation
------------

    cd scripts

Extract Trang binary to current directory:

    wget http://jing-trang.googlecode.com/files/trang-20081028.zip
    unzip -ej trang-20081028.zip trang-20081028/trang.jar
    rm trang-20081028.zip

Run setup scripts:

    ./fetch-schema
    ./generate-index
    ./generate-previews

Set generate-index and generate-previews to run periodically via cron.

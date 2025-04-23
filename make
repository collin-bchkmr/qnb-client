#!/bin/sh
npm run make

rm -rf ./out/make/AppImage

# Find QNB ZIP from npm run make
zipfile=$(find ./out/make/zip/linux/x64/ -type f -name "Qiqi*.zip" | head -n 1)

# Check if a zip file was found
if [ -z "$zipfile" ]; then
    echo "No zip file found that starts with Qiqi."
    exit 1
fi

# Unzip the found zip file
echo "Unzipping $zipfile"
echo "A\n" | unzip "$zipfile"

mkdir -p ./out/make/AppImage/AppDir/usr/bin

cp ./assets/logo.png ./out/make/AppImage/AppDir/

# --- Create the .desktop file ---
cat > ./out/make/AppImage/AppDir/Qiqis-Notebook.desktop << EOF
[Desktop Entry]
Name=Qiqi's Notebook
Exec="$APPDIR/usr/bin/Qiqi's Notebook" %u
Icon=logo
Type=Application
Categories=Utility;
MimeType=x-scheme-handler/qnb-client;
EOF


# --- Create AppRun ---
cat > ./out/make/AppImage/AppDir/AppRun << EOF
#!/bin/sh
exec "\$APPDIR/usr/bin/Qiqi's Notebook" "\$@"
EOF


chmod +x ./out/make/AppImage/AppDir/AppRun

# Copy files from the extracted folder to the AppImage structure
cp -r "./out/make/zip/linux/x64/Qiqi's Notebook-linux-x64/"* ./out/make/AppImage/AppDir/usr/bin/

# Create the AppImage using appimagetool
~/appimagetool-x86_64.AppImage ./out/make/AppImage/AppDir

# Cleanup: delete the AppDir folder and other temporary folders
rm -rf ./out/make/AppImage/AppDir
rm -rf Qiqi\'s\ Notebook-linux-x64/

mv ./Qiqi\'s_Notebook-x86_64.AppImage ./out/make/AppImage

echo "AppImage created successfully and temporary folders deleted."

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// Hàm chạy lệnh shell
const runCommand = (command, callback) => {
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            callback(stderr);
            return;
        }
        callback(stdout);
    });
};

// API handler cho Vercel
module.exports = (req, res) => {
    // Kiểm tra xem file ISO đã tải chưa
    const isoPath = "/tmp/Updated_Win10PE_x64.iso";
    if (!fs.existsSync(isoPath)) {
        runCommand(`wget -O ${isoPath} https://archive.org/download/updated-win-10-pe-x-64/Updated_Win10PE_x64.iso`, (output) => {
            console.log("ISO downloaded:", output);
        });
    }

    // Tạo ổ đĩa ảo nếu chưa có
    const diskPath = "/tmp/disk.img";
    if (!fs.existsSync(diskPath)) {
        runCommand(`dd if=/dev/zero of=${diskPath} bs=1M count=32768`, (output) => {
            console.log("Disk created:", output);
        });
    }

    // Cài đặt các gói cần thiết
    runCommand("apt update && apt install -y qemu-system-x86 wget websockify novnc", (output) => {
        console.log("Packages installed:", output);

        // Chạy Websockify
        runCommand("websockify --web=/usr/share/novnc/ 8006 localhost:5900 &", (output) => {
            console.log("Websockify started:", output);
        });

        // Chạy QEMU
        const qemuCmd = `
            qemu-system-x86_64 \
            -m 512 \
            -smp $(nproc) \
            -drive file=${isoPath},index=0,media=cdrom \
            -hda ${diskPath} \
            -net none \
            -no-kvm \
            -vnc :0
        `;

        runCommand(qemuCmd, (output) => {
            console.log("QEMU started:", output);
            res.status(200).json({ message: "QEMU is running", output });
        });
    });
};

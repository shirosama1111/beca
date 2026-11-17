let drawing = false;
let tool = "brush";
let color = "#ff0000";
let size = 10;

let startX = 0;
let startY = 0;
let scale = 1;

let history = [];

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SHOW_EDITOR") {

        const style = document.createElement("style");
        style.innerHTML = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .tool-btn {
            padding: 6px;
            border: 1px solid #ccc;
            border-radius: 6px;
            background: white;
            cursor: pointer;
            transition: all 0.15s ease;
        }
                
        .tool-btn:hover {
            background: #f5f5f5;
        }
                
        .tool-btn:active {
            transform: scale(0.9);
            box-shadow: inset 0 2px 5px rgba(0,0,0,0.2);
        }
                
        .tool-active {
            background: #e0e0e0 !important; /* xám nhẹ */
            transform: scale(0.92);
            box-shadow: 
            inset 0 3px 6px rgba(0,0,0,0.25),
            inset 0 -1px 2px rgba(255,255,255,0.6);
            opacity: 0.85;
        }
}`;
        document.head.appendChild(style);

        const overlay = document.createElement("div");
        overlay.style = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.5);
            z-index:999999;
        `;

        const baseCanvas = document.createElement("canvas");
        const drawCanvas = document.createElement("canvas");
        const previewCanvas = document.createElement("canvas");

        const baseCtx = baseCanvas.getContext("2d");
        const drawCtx = drawCanvas.getContext("2d");
        const previewCtx = previewCanvas.getContext("2d");

        [baseCanvas, drawCanvas, previewCanvas].forEach(c => {
            c.style.position = "absolute";
            c.style.top = "0";
            c.style.left = "0";
        });

        previewCanvas.style.pointerEvents = "none";

        const cursor = document.createElement("div");
        cursor.style = `
            position:fixed;
            width:${size}px;
            height:${size}px;
            border-radius:50%;
            background:rgba(255,255,255,0.3);
            pointer-events:none;
            z-index:1000003;
        `;
        document.body.appendChild(cursor);

        drawCanvas.addEventListener("mousemove", (e) => {
            cursor.style.left = e.clientX - size / 2 + "px";
            cursor.style.top = e.clientY - size / 2 + "px";
        });

        const img = new Image();
        img.src = message.image;

        img.onload = () => {
            baseCanvas.width = drawCanvas.width = previewCanvas.width = img.width;
            baseCanvas.height = drawCanvas.height = previewCanvas.height = img.height;

            baseCtx.drawImage(img, 0, 0);
            saveState(); // 👈 lưu trạng thái ban đầu
        };

        function saveState() {
            const temp = document.createElement("canvas");
            const tctx = temp.getContext("2d");

            temp.width = baseCanvas.width;
            temp.height = baseCanvas.height;

            tctx.drawImage(baseCanvas, 0, 0);
            tctx.drawImage(drawCanvas, 0, 0);

            history.push(temp.toDataURL());

            if (history.length > 20) history.shift();
        }

        function undo() {
            if (history.length <= 1) return;

            history.pop();

            const img = new Image();
            img.src = history[history.length - 1];

            img.onload = () => {
                baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
                drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

                baseCtx.drawImage(img, 0, 0);
            };
        }

        drawCanvas.addEventListener("mousedown", (e) => {
            drawing = true;
            startX = e.offsetX;
            startY = e.offsetY;

            drawCtx.beginPath();
            drawCtx.moveTo(startX, startY);
        });

        drawCanvas.addEventListener("mouseup", (e) => {
            drawing = false;

            let w = e.offsetX - startX;
            let h = e.offsetY - startY;

            if (tool === "rect") {
                drawCtx.strokeStyle = color;
                drawCtx.lineWidth = size;
                drawCtx.strokeRect(startX, startY, w, h);
            }

            if (tool === "highlight") {
                drawCtx.fillStyle = "rgba(255,255,0,0.3)";
                drawCtx.fillRect(startX, startY, w, h);
            }

            if (tool === "circle" || tool === "ellipse") {
                let w = e.offsetX - startX;
                let h = e.offsetY - startY;

                drawCtx.beginPath(); // ✅ đúng canvas
                drawCtx.strokeStyle = color;
                drawCtx.lineWidth = size;

                if (tool === "circle") {
                    let r = Math.min(Math.abs(w), Math.abs(h)) / 2;

                    drawCtx.arc(
                        startX + (w > 0 ? r : -r),
                        startY + (h > 0 ? r : -r),
                        r,
                        0,
                        Math.PI * 2
                    );
                } else {
                    drawCtx.ellipse(
                        startX + w/2,
                        startY + h/2,
                        Math.abs(w/2),
                        Math.abs(h/2),
                        0,
                        0,
                        Math.PI * 2
                    );
                }

                drawCtx.stroke();
            }

            if (tool === "crop") {
                crop(startX, startY, w, h);
            }

            previewCtx.clearRect(0,0,previewCanvas.width,previewCanvas.height);
            drawCtx.globalCompositeOperation = "source-over";

            saveState(); // 👈 lưu sau mỗi thao tác
        });

        drawCanvas.addEventListener("mousemove", (e) => {
            if (!drawing) return;

            drawCtx.lineWidth = size;
            drawCtx.lineCap = "round";

            if (tool === "brush") {
                drawCtx.globalCompositeOperation = "source-over";
                drawCtx.strokeStyle = color;
                drawCtx.lineTo(e.offsetX, e.offsetY);
                drawCtx.stroke();
            }

            if (tool === "eraser") {
                drawCtx.globalCompositeOperation = "destination-out";
                drawCtx.lineTo(e.offsetX, e.offsetY);
                drawCtx.stroke();
            }

            if (["rect","highlight","crop","circle","ellipse"].includes(tool)) {
                previewCtx.clearRect(0,0,previewCanvas.width,previewCanvas.height);

                let w = e.offsetX - startX;
                let h = e.offsetY - startY;

                previewCtx.strokeStyle = "white";

                if (tool === "rect" || tool === "crop") {
                    previewCtx.strokeRect(startX, startY, w, h);
                }

                if (tool === "highlight") {
                    previewCtx.fillStyle = "rgba(255,255,0,0.3)";
                    previewCtx.fillRect(startX, startY, w, h);
                }

                if (tool === "circle") {
                    let r = Math.min(Math.abs(w), Math.abs(h)) / 2;

                    previewCtx.beginPath();
                    previewCtx.arc(
                        startX + (w > 0 ? r : -r),
                        startY + (h > 0 ? r : -r),
                        r,
                        0,
                        Math.PI * 2
                    );
                    previewCtx.stroke();
                }

                if (tool === "ellipse") {
                    previewCtx.beginPath();
                    previewCtx.ellipse(
                        startX + w/2,
                        startY + h/2,
                        Math.abs(w/2),
                        Math.abs(h/2),
                        0,0,Math.PI*2
                    );
                    previewCtx.stroke();
                }
            }
        });

        overlay.addEventListener("wheel", (e) => {
            e.preventDefault();
            scale += e.deltaY * -0.001;
            scale = Math.min(Math.max(.5, scale), 3);

            [baseCanvas, drawCanvas, previewCanvas].forEach(c => {
                c.style.transform = `scale(${scale})`;
            });
        });

        function crop(x, y, w, h) {
            const temp = document.createElement("canvas");
            const tctx = temp.getContext("2d");

            temp.width = Math.abs(w);
            temp.height = Math.abs(h);

            tctx.drawImage(baseCanvas, x, y, w, h, 0, 0, temp.width, temp.height);
            tctx.drawImage(drawCanvas, x, y, w, h, 0, 0, temp.width, temp.height);

            baseCanvas.width = drawCanvas.width = temp.width;
            baseCanvas.height = drawCanvas.height = temp.height;

            baseCtx.drawImage(temp, 0, 0);
            drawCtx.clearRect(0,0,temp.width,temp.height);
        }

        const toolbar = document.createElement("div");
        toolbar.style = `
            position:fixed;
            top:20px;
            left:20px;
            background:white;
            padding:10px;
            z-index:1000001;
            display:flex;
            gap:5px;
        `;

        function setActive(btn) {
            document.querySelectorAll(".tool-btn").forEach(b=>{
                b.classList.remove("tool-active");
            });
            btn.classList.add("tool-active");
        }

        const undoBtn = document.createElement("button");
        undoBtn.innerText = "↩️";
        undoBtn.onclick = undo;
        toolbar.appendChild(undoBtn);

        const tools = [
            ["✏️","brush"],
            ["🧽","eraser"],
            ["⬛","rect"],
            ["⚪","circle"],
            ["🥚","ellipse"],
            ["🟡","highlight"],
            ["✂️","crop"]
        ];

        tools.forEach(([icon,val])=>{
            const btn=document.createElement("button");
            btn.innerText=icon;
            btn.className="tool-btn";

            Object.assign(btn.style, {
                padding: "6px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                background: "white",
                cursor: "pointer"
            });

            btn.onclick=()=>{
                tool=val;
                setActive(btn);
            };

            toolbar.appendChild(btn);

            if (val === "brush") {
                setActive(btn);
            }
        });

        const colorInput = document.createElement("input");
        colorInput.type="color";
        colorInput.onchange=e=>color=e.target.value;
        toolbar.appendChild(colorInput);

        const sizeInput = document.createElement("input");
        sizeInput.type="range";
        sizeInput.min=5;
        sizeInput.max=50;
        sizeInput.value=size;
        sizeInput.oninput=e=>{
            size=e.target.value;
            cursor.style.width=size+"px";
            cursor.style.height=size+"px";
        };
        toolbar.appendChild(sizeInput);

        const doneBtn = document.createElement("button");
        doneBtn.innerText = "Xong";

        Object.assign(doneBtn.style, {
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: "1000002",

            padding: "12px 18px",
            border: "none",
            borderRadius: "8px",

            background: "linear-gradient(135deg,#ff4d4f,#ff7875)",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",

            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            transition: "all 0.2s ease",
            overflow: "hidden"
        });

        doneBtn.onmouseenter = () => {
            doneBtn.style.transform = "translateY(-2px) scale(1.05)";
            doneBtn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.4)";
        };

        doneBtn.onmouseleave = () => {
            doneBtn.style.transform = "scale(1)";
            doneBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
        };

        doneBtn.onmousedown = (e) => {
            doneBtn.style.transform = "scale(0.95)";

            const ripple = document.createElement("span");
            ripple.style.position = "absolute";
            ripple.style.borderRadius = "50%";
            ripple.style.background = "rgba(255,255,255,0.5)";
            ripple.style.transform = "scale(0)";
            ripple.style.animation = "ripple 0.5s linear";
            ripple.style.pointerEvents = "none";

            const rect = doneBtn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);

            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = e.clientX - rect.left - size/2 + "px";
            ripple.style.top = e.clientY - rect.top - size/2 + "px";

            doneBtn.appendChild(ripple);

            setTimeout(() => ripple.remove(), 500);
        };

        doneBtn.onmouseup = () => {
            doneBtn.style.transform = "scale(1)";
        };

        doneBtn.onclick = () => {

            doneBtn.innerText = "Đang lưu...";
            doneBtn.style.background = "#999";
            doneBtn.style.cursor = "not-allowed";

            const finalCanvas = document.createElement("canvas");
            const fctx = finalCanvas.getContext("2d");

            finalCanvas.width = baseCanvas.width;
            finalCanvas.height = baseCanvas.height;

            fctx.drawImage(baseCanvas, 0, 0);
            fctx.drawImage(drawCanvas, 0, 0);

            const img = finalCanvas.toDataURL();

            chrome.storage.local.get("screenshots", (d) => {
                let list = d.screenshots || [];
                list.push(img);

                chrome.storage.local.set({ screenshots: list }, () => {

                    doneBtn.innerText = "✅ Đã lưu!";
                    doneBtn.style.background = "#52c41a";

                    setTimeout(() => {
                        overlay.remove();
                        toolbar.remove();
                        doneBtn.remove();
                        cursor.remove();
                    }, 800);

                });
            });
        };

        overlay.appendChild(baseCanvas);
        overlay.appendChild(drawCanvas);
        overlay.appendChild(previewCanvas);

        document.body.appendChild(overlay);
        document.body.appendChild(toolbar);
        document.body.appendChild(doneBtn);
    }
});
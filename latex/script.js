// ===================== 全局变量 =====================
// 存储截图的base64数据（供提交时使用）
let canvasScreenshotData = '';

// ===================== 原有核心功能 =====================
// 获取DOM元素
const canvas = document.getElementById('handwrite-canvas');
const ctx = canvas.getContext('2d');
const penBtn = document.getElementById('pen-btn');
const eraserBtn = document.getElementById('eraser-btn');
const clearBtn = document.getElementById('clear-btn');
const previewScreenshotBtn = document.getElementById('preview-screenshot-btn'); // 新增
const submitBtn = document.getElementById('submit-btn');
const latexCode = document.getElementById('latex-code');
const previewContent = document.getElementById('preview-content');
const writeArea = document.getElementById('write-area');
// 获取弹窗元素
const alertOverlay = document.getElementById('custom-alert-overlay');
const alertMessage = document.getElementById('alert-message');
const alertConfirmBtn = document.getElementById('alert-confirm-btn');


// 添加推送按钮相关DOM
const pushBtn = document.getElementById('push-btn');

// 推送至PC功能
pushBtn.addEventListener('click', async () => {
    const latexStr = latexCode.value.trim();
    
    if (!latexStr) {
        showAlert('没有可推送的LaTeX代码！');
        return;
    }
    
    // 获取PC端IP和端口设置
    const savedSettings = localStorage.getItem('formulaRecognitionSettings');
    if (!savedSettings) {
        showAlert('请先配置PC端IP地址！');
        return;
    }
    
    const settings = JSON.parse(savedSettings);
    const pcIp = settings.pcIp || '127.0.0.1';
    const pcPort = settings.pcPort || 8000;
    
    try {
        // 发送LaTeX代码到PC端服务器
        const response = await fetch(`http://${pcIp}:${pcPort}/copy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ latex: latexStr }),
        });
        
        if (response.ok) {
            showAlert('已成功推送到PC剪贴板！');
        } else {
            showAlert('推送失败，请检查PC端是否运行且IP配置正确');
        }
    } catch (error) {
        showAlert('连接失败，请检查PC端是否运行且IP配置正确');
        console.error('推送失败:', error);
    }
});

// 显示提示弹窗
function showAlert(message) {
    alertMessage.textContent = message;
    alertOverlay.style.display = 'flex';
    // 阻止背景滚动
    document.body.style.overflow = 'hidden';
}

// 关闭提示弹窗
function closeAlert() {
    alertOverlay.style.display = 'none';
    // 恢复背景滚动
    document.body.style.overflow = '';
}

// 绑定弹窗确认按钮事件
alertConfirmBtn.addEventListener('click', closeAlert);

// 点击弹窗外部关闭
alertOverlay.addEventListener('click', (e) => {
    if (e.target === alertOverlay) {
        closeAlert();
    }
});

// 画布自适应调整
function resizeCanvas() {
    canvas.width = writeArea.clientWidth;
    canvas.height = writeArea.clientHeight;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 动态调整笔/橡皮尺寸
    penWidth = Math.max(2, canvas.width / 240);
    eraserWidth = Math.max(10, canvas.width / 48);
}

// 初始化变量
let isDrawing = false;
let currentTool = 'pen';
let lastX = 0;
let lastY = 0;
let penWidth = 4;
let eraserWidth = 20;
const penColor = '#000000';

// 监听窗口变化
window.addEventListener('load', () => {
    resizeCanvas();
    loadSettings(); // 页面加载时读取设置
});
window.addEventListener('resize', resizeCanvas);

// 工具切换
penBtn.addEventListener('click', () => {
    currentTool = 'pen';
    penBtn.classList.add('active');
    eraserBtn.classList.remove('active');
});

eraserBtn.addEventListener('click', () => {
    currentTool = 'eraser';
    eraserBtn.classList.add('active');
    penBtn.classList.remove('active');
});

// 一键擦除
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 清空截图数据
    canvasScreenshotData = '';
});

// 更新公式预览
function updatePreview(latexStr) {
    const pureLatex = latexStr.replace(/%.+/g, '').trim();
    if (pureLatex) {
        previewContent.innerHTML = `\\[${pureLatex}\\]`;
        MathJax.typesetPromise([previewContent]);
    } else {
        previewContent.innerHTML = "请手写公式后点击「预览截图」确认，再提交识别";
    }
}

// 坐标计算
function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
}

// 鼠标手写逻辑
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = getCanvasPos(e);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const [x, y] = getCanvasPos(e);
    ctx.beginPath();
    ctx.lineCap = 'round';

    if (currentTool === 'pen') {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.arc(x, y, eraserWidth/2, 0, Math.PI * 2);
        ctx.fill();
    }
    [lastX, lastY] = [x, y];
});

canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);

// 触摸事件适配（平板/手机）
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDrawing = true;
    const touch = e.touches[0];
    [lastX, lastY] = getCanvasPos(touch);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const [x, y] = getCanvasPos(touch);
    
    ctx.beginPath();
    ctx.lineCap = 'round';
    if (currentTool === 'pen') {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.arc(x, y, eraserWidth/2, 0, Math.PI * 2);
        ctx.fill();
    }
    [lastX, lastY] = [x, y];
});

canvas.addEventListener('touchend', () => isDrawing = false);

// ===================== 设置弹窗功能 =====================
// 获取设置相关DOM
const settingsBtn = document.getElementById('settings-btn');
const settingsModalOverlay = document.getElementById('settings-modal-overlay');
const closeSettingsModal = document.getElementById('close-settings-modal');
const saveSettingsBtn = document.getElementById('save-settings');
const apiUrlInput = document.getElementById('api-url');
const apiKeyInput = document.getElementById('api-key');
const modelNameInput = document.getElementById('model-name');
const promptDescInput = document.getElementById('prompt-desc');

// 打开设置弹窗
settingsBtn.addEventListener('click', () => {
    settingsModalOverlay.style.display = 'flex';
});

// 关闭设置弹窗（按钮）
closeSettingsModal.addEventListener('click', () => {
    settingsModalOverlay.style.display = 'none';
});

// 点击设置弹窗外部关闭
settingsModalOverlay.addEventListener('click', (e) => {
    if (e.target === settingsModalOverlay) {
        settingsModalOverlay.style.display = 'none';
    }
});

// 保存设置到localStorage
function saveSettings() {
    const settings = {
        apiUrl: apiUrlInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        modelName: modelNameInput.value.trim(),
        promptDesc: promptDescInput.value.trim(),
        pcIp: document.getElementById('pc-ip').value.trim(),  // 新增
        pcPort: document.getElementById('pc-port').value.trim()  // 新增
    };
    localStorage.setItem('formulaRecognitionSettings', JSON.stringify(settings));
    showAlert('设置保存成功！');
    settingsModalOverlay.style.display = 'none';
}

// 加载本地保存的设置
function loadSettings() {
    const savedSettings = localStorage.getItem('formulaRecognitionSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        apiUrlInput.value = settings.apiUrl || 'https://apis.iflow.cn/v1/chat/completions';
        apiKeyInput.value = settings.apiKey || '';
        modelNameInput.value = settings.modelName || 'TBStars2-200B-A13B';
        promptDescInput.value = settings.promptDesc || '请识别手写的数学公式，并转换为标准的LaTeX代码，仅返回LaTeX代码本身，不要任何多余的解释、说明文字。';
    }
}

// 绑定保存按钮事件
saveSettingsBtn.addEventListener('click', saveSettings);

// 按ESC键关闭所有弹窗
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        settingsModalOverlay.style.display = 'none';
        screenshotModalOverlay.style.display = 'none';
    }
});

// ===================== 新增截图预览功能 =====================
// 获取截图预览相关DOM
const screenshotModalOverlay = document.getElementById('screenshot-modal-overlay');
const closeScreenshotModal = document.getElementById('close-screenshot-modal');
const screenshotImage = document.getElementById('screenshot-image');
const confirmScreenshotBtn = document.getElementById('confirm-screenshot-btn');
const cancelScreenshotBtn = document.getElementById('cancel-screenshot-btn');

// 生成画布截图并打开预览弹窗
previewScreenshotBtn.addEventListener('click', () => {
    // 检查画布是否为空（简单判断：获取像素数据，看是否全白）
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let isCanvasEmpty = true;
    
    for (let i = 0; i < data.length; i += 4) {
        // RGBA：如果不是白色（255,255,255,255），说明有内容
        if (data[i] !== 255 || data[i+1] !== 255 || data[i+2] !== 255) {
            isCanvasEmpty = false;
            break;
        }
    }

    if (isCanvasEmpty) {
        showAlert('画布为空，请先手写公式！');
        return;
    }

    // 生成画布的base64截图
    canvasScreenshotData = canvas.toDataURL('image/png', 1.0); // 1.0=无损质量
    // 设置预览图片src
    screenshotImage.src = canvasScreenshotData;
    // 打开预览弹窗
    screenshotModalOverlay.style.display = 'flex';
});

// 关闭截图预览弹窗
closeScreenshotModal.addEventListener('click', () => {
    screenshotModalOverlay.style.display = 'none';
});

// 点击截图弹窗外部关闭
screenshotModalOverlay.addEventListener('click', (e) => {
    if (e.target === screenshotModalOverlay) {
        screenshotModalOverlay.style.display = 'none';
    }
});

// 取消截图预览（重新书写）
cancelScreenshotBtn.addEventListener('click', () => {
    screenshotModalOverlay.style.display = 'none';
    // 可选：清空画布（也可保留，让用户手动擦除）
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.fillStyle = '#ffffff';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
    // canvasScreenshotData = '';
});

// 确认截图并提交识别
confirmScreenshotBtn.addEventListener('click', () => {
    screenshotModalOverlay.style.display = 'none';
    // 调用提交识别逻辑
    submitRecognition();
});

// ===================== API提交识别逻辑（重构） =====================
// 提交识别核心函数（供确认截图后调用）
async function submitRecognition() {
    // 1. 检查是否有截图数据
    if (!canvasScreenshotData) {
        showAlert('请先点击「预览截图」确认手写内容！');
        return;
    }

    // 2. 读取本地保存的设置
    const savedSettings = localStorage.getItem('formulaRecognitionSettings');
    if (!savedSettings) {
        showAlert('请先点击右上角「设置」按钮，配置API密钥等信息！');
        return;
    }
    const settings = JSON.parse(savedSettings);
    
    // 3. 校验必要参数
    if (!settings.apiKey || settings.apiKey.trim() === '') {
        showAlert('API密钥不能为空，请在设置中填写！');
        return;
    }
    if (!settings.apiUrl || settings.apiUrl.trim() === '') {
        showAlert('API地址不能为空，请在设置中填写！');
        return;
    }
    if (!settings.modelName || settings.modelName.trim() === '') {
        showAlert('模型名称不能为空，请在设置中填写！');
        return;
    }

    // 4. 设置加载状态
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.textContent = '识别中...';
    
    try {
        // 5. 构建请求参数（包含截图信息，若API支持图片输入）
        const requestBody = {
            model: settings.modelName,
            messages: [
                {
                    role: 'user',
                    content: [
                        // 文本提示词
                        { type: 'text', text: settings.promptDesc },
                        // 图片数据（base64）- 需API支持图片输入，若不支持可只传文本
                        { 
                            type: 'image_url', 
                            image_url: { 
                                url: canvasScreenshotData,
                                detail: 'high' // 高精度识别
                            } 
                        }
                    ]
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        };

        // 6. 发起API请求（完全对齐官方调用方式）
        const response = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        // 7. 处理响应状态
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API请求失败 [${response.status}]：${errorData.error?.message || '未知错误'}`);
        }

        // 8. 解析响应数据
        const data = await response.json();
        
        // 9. 提取LaTeX代码（API返回的content）
        const latexContent = data.choices?.[0]?.message?.content || '';
        if (!latexContent) {
            throw new Error('API返回数据格式异常，未找到LaTeX代码');
        }

        // 10. 更新界面显示
        latexCode.value = `${latexContent}`;
        updatePreview(latexContent);

    } catch (error) {
        // 11. 错误处理
        alert(`识别失败：${error.message}`);
        console.error('API调用错误：', error);
    } finally {
        // 12. 恢复按钮状态
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = '提交识别';
    }
}

// 绑定提交按钮点击事件（备用：直接点击提交也触发预览检查）
submitBtn.addEventListener('click', () => {
    // 如果已有截图数据，直接提交；否则先提示预览
    if (canvasScreenshotData) {
        submitRecognition();
    } else {
        showAlert('请先点击「预览截图」确认手写内容后再提交！');
        // 可选：自动打开预览弹窗
        // previewScreenshotBtn.click();
    }
});
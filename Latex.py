import http.server
import socketserver
import json
import pyperclip
from http import HTTPStatus
import argparse

class LaTeXRequestHandler(http.server.SimpleHTTPRequestHandler):
    def _set_headers(self, status_code=HTTPStatus.OK):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')  # 允许跨域访问
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        # 处理跨域预检请求
        self._set_headers()

    def do_POST(self):
        if self.path == '/copy':
            # 读取请求数据
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # 检查是否包含latex数据
            if 'latex' in data:
                latex_code = data['latex']
                # 复制到剪贴板
                pyperclip.copy(latex_code)
                print(f"已复制LaTeX代码到剪贴板: {latex_code}")
                
                # 返回成功响应
                self._set_headers()
                self.wfile.write(json.dumps({'status': 'success', 'message': '已复制到剪贴板'}).encode('utf-8'))
            else:
                self._set_headers(HTTPStatus.BAD_REQUEST)
                self.wfile.write(json.dumps({'status': 'error', 'message': '缺少latex参数'}).encode('utf-8'))
        else:
            self._set_headers(HTTPStatus.NOT_FOUND)
            self.wfile.write(json.dumps({'status': 'error', 'message': '路径不存在'}).encode('utf-8'))

def run_server(port=8000):
    handler = LaTeXRequestHandler
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"LaTeX接收服务器已启动，端口: {port}")
        print(f"请确保手机与电脑在同一局域网，IP地址: {get_local_ip()}")
        print("按Ctrl+C停止服务器")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")

def get_local_ip():
    """获取本地IP地址"""
    import socket
    try:
        # 创建一个临时socket连接来获取本地IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except:
        return "127.0.0.1"

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='LaTeX代码接收服务器，用于接收并复制到剪贴板')
    parser.add_argument('--port', type=int, default=8000, help='服务器端口号，默认8000')
    args = parser.parse_args()
    
    # 确保pyperclip可用
    try:
        pyperclip.copy('test')
        if pyperclip.paste() == 'test':
            run_server(args.port)
        else:
            print("无法访问剪贴板，请检查系统权限或安装必要的依赖")
    except Exception as e:
        print(f"初始化失败: {e}")
        print("可能需要安装pyperclip: pip install pyperclip")
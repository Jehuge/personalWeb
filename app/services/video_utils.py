"""
视频处理工具
使用ffmpeg处理视频，生成高质量缩略视频
"""
import subprocess
import tempfile
import os
from pathlib import Path
from typing import Optional, Dict, Any
import json


def check_ffmpeg_available() -> bool:
    """检查ffmpeg是否可用"""
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def get_video_info(video_path: str) -> Optional[Dict[str, Any]]:
    """
    获取视频信息
    
    Args:
        video_path: 视频文件路径
        
    Returns:
        包含视频信息的字典，如果失败返回None
    """
    if not check_ffmpeg_available():
        return None
    
    try:
        # 使用ffprobe获取视频信息
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            video_path
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            return None
        
        data = json.loads(result.stdout)
        
        # 提取视频流信息
        video_stream = None
        for stream in data.get('streams', []):
            if stream.get('codec_type') == 'video':
                video_stream = stream
                break
        
        if not video_stream:
            return None
        
        # 提取格式信息
        format_info = data.get('format', {})
        
        # 计算时长
        duration = float(format_info.get('duration', 0))
        
        # 提取分辨率
        width = int(video_stream.get('width', 0))
        height = int(video_stream.get('height', 0))
        
        # 提取编码信息
        codec = video_stream.get('codec_name', '')
        codec_long = video_stream.get('codec_long_name', '')
        
        # 提取帧率
        fps_str = video_stream.get('r_frame_rate', '0/1')
        fps = 0.0
        if '/' in fps_str:
            num, den = map(float, fps_str.split('/'))
            if den > 0:
                fps = num / den
        
        # 提取比特率
        bitrate = int(format_info.get('bit_rate', 0))
        
        # 文件大小
        file_size = int(format_info.get('size', 0))
        
        # 格式
        format_name = format_info.get('format_name', '').split(',')[0]
        
        return {
            'duration': int(duration),
            'width': width,
            'height': height,
            'codec': codec,
            'codec_long': codec_long,
            'fps': round(fps, 2),
            'bitrate': bitrate,
            'file_size': file_size,
            'format': format_name,
        }
    except Exception as e:
        print(f"获取视频信息失败: {e}")
        return None


def generate_video_quality(
    input_path: str,
    output_path: str,
    max_width: Optional[int] = None,
    max_height: Optional[int] = None,
    scale_ratio: Optional[float] = None,
    crf: int = 26,
    preset: str = 'medium',
    max_duration: Optional[int] = None,
    audio_bitrate: str = '128k'
) -> bool:
    """
    生成指定画质的视频
    
    Args:
        input_path: 输入视频路径
        output_path: 输出视频路径
        max_width: 最大宽度（如果指定scale_ratio则忽略）
        max_height: 最大高度（如果指定scale_ratio则忽略）
        scale_ratio: 缩放比例（0.0-1.0），如果指定则按比例缩放，优先级高于max_width/max_height
        crf: CRF值（0-51，越小质量越高，文件越大）
        preset: 编码预设（ultrafast, fast, medium, slow, veryslow）
        max_duration: 最大时长（秒），如果指定则截取前N秒
        audio_bitrate: 音频比特率
        
    Returns:
        是否成功
    """
    if not check_ffmpeg_available():
        print("ffmpeg不可用")
        return False
    
    try:
        # 获取视频信息
        video_info = get_video_info(input_path)
        if not video_info:
            print("无法获取视频信息")
            return False
        
        original_width = video_info['width']
        original_height = video_info['height']
        duration = video_info['duration']
        
        # 计算缩放尺寸，保持宽高比
        if scale_ratio is not None:
            # 按比例缩放
            scale_width = int(original_width * scale_ratio)
            scale_height = int(original_height * scale_ratio)
        elif max_width is not None and max_height is not None:
            # 按最大尺寸限制缩放
            scale_width = original_width
            scale_height = original_height
            if original_width > max_width or original_height > max_height:
                ratio = min(max_width / original_width, max_height / original_height)
                scale_width = int(original_width * ratio)
                scale_height = int(original_height * ratio)
        else:
            # 不缩放
            scale_width = original_width
            scale_height = original_height
        
        # 确保是偶数（某些编码器要求）
        scale_width = scale_width - (scale_width % 2)
        scale_height = scale_height - (scale_height % 2)
        
        # 构建ffmpeg命令
        cmd = ['ffmpeg', '-i', input_path]
        
        # 如果指定了最大时长，截取前N秒
        if max_duration and duration > max_duration:
            cmd.extend(['-t', str(max_duration)])
        
        # 视频编码参数
        cmd.extend([
            '-vf', f'scale={scale_width}:{scale_height}',
            '-c:v', 'libx264',
            '-preset', preset,
            '-crf', str(crf),
            '-c:a', 'aac',
            '-b:a', audio_bitrate,
            '-movflags', '+faststart',  # 优化web播放
            '-y',  # 覆盖输出文件
            output_path
        ])
        
        # 执行ffmpeg命令
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600  # 10分钟超时
        )
        
        if result.returncode != 0:
            print(f"ffmpeg处理失败: {result.stderr}")
            return False
        
        return True
    except subprocess.TimeoutExpired:
        print("ffmpeg处理超时")
        return False
    except Exception as e:
        print(f"生成视频失败: {e}")
        return False


def generate_thumbnail_video(
    input_path: str,
    output_path: str,
    max_width: int = 1920,
    max_height: int = 1080,
    quality: str = 'high',
    max_duration: Optional[int] = None
) -> bool:
    """
    生成高质量缩略视频
    
    Args:
        input_path: 输入视频路径
        output_path: 输出视频路径
        max_width: 最大宽度（默认1920）
        max_height: 最大高度（默认1080）
        quality: 质量级别 'high'（高质量）或 'medium'（中等质量）
        max_duration: 最大时长（秒），如果指定则截取前N秒
        
    Returns:
        是否成功
    """
    if not check_ffmpeg_available():
        print("ffmpeg不可用")
        return False
    
    try:
        # 获取视频信息
        video_info = get_video_info(input_path)
        if not video_info:
            print("无法获取视频信息")
            return False
        
        original_width = video_info['width']
        original_height = video_info['height']
        duration = video_info['duration']
        
        # 计算缩放尺寸，保持宽高比
        scale_width = original_width
        scale_height = original_height
        
        if original_width > max_width or original_height > max_height:
            ratio = min(max_width / original_width, max_height / original_height)
            scale_width = int(original_width * ratio)
            scale_height = int(original_height * ratio)
            # 确保是偶数（某些编码器要求）
            scale_width = scale_width - (scale_width % 2)
            scale_height = scale_height - (scale_height % 2)
        
        # 构建ffmpeg命令
        cmd = ['ffmpeg', '-i', input_path]
        
        # 如果指定了最大时长，截取前N秒
        if max_duration and duration > max_duration:
            cmd.extend(['-t', str(max_duration)])
        
        # 使用新的generate_video_quality函数
        if quality == 'high':
            return generate_video_quality(
                input_path,
                output_path,
                max_width=max_width,
                max_height=max_height,
                crf=26,
                preset='medium',
                max_duration=max_duration,
                audio_bitrate='128k'
            )
        else:
            return generate_video_quality(
                input_path,
                output_path,
                max_width=max_width,
                max_height=max_height,
                crf=28,
                preset='fast',
                max_duration=max_duration,
                audio_bitrate='96k'
            )
    except subprocess.TimeoutExpired:
        print("ffmpeg处理超时")
        return False
    except Exception as e:
        print(f"生成缩略视频失败: {e}")
        return False


def process_video_file(
    video_content: bytes,
    filename: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    处理视频文件：生成缩略视频并获取视频信息
    
    Args:
        video_content: 视频文件内容（字节）
        filename: 原始文件名（可选）
        
    Returns:
        包含视频信息和缩略视频内容的字典，如果失败返回None
    """
    if not check_ffmpeg_available():
        return None
    
    # 创建临时文件
    temp_input = None
    temp_output = None
    
    try:
        # 写入临时输入文件
        suffix = Path(filename).suffix if filename else '.mp4'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            f.write(video_content)
            temp_input = f.name
        
        # 获取视频信息
        video_info = get_video_info(temp_input)
        if not video_info:
            return None
        
        # 生成缩略视频
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as f:
            temp_output = f.name
        
        # 生成缩略视频（最大1280x720，如果视频超过20秒则截取前20秒）
        success = generate_thumbnail_video(
            temp_input,
            temp_output,
            max_width=1280,
            max_height=720,
            quality='high',
            max_duration=20  # 缩略视频最多20秒
        )
        
        if not success:
            return None
        
        # 读取缩略视频内容
        with open(temp_output, 'rb') as f:
            thumbnail_content = f.read()
        
        # 获取缩略视频文件大小
        thumbnail_file_size = len(thumbnail_content)
        
        # 获取缩略视频信息（用于验证）
        thumbnail_info = get_video_info(temp_output)
        
        return {
            **video_info,
            'thumbnail_content': thumbnail_content,
            'thumbnail_file_size': thumbnail_file_size,
            'thumbnail_width': thumbnail_info.get('width') if thumbnail_info else None,
            'thumbnail_height': thumbnail_info.get('height') if thumbnail_info else None,
        }
    except Exception as e:
        print(f"处理视频文件失败: {e}")
        return None
    finally:
        # 清理临时文件
        if temp_input and os.path.exists(temp_input):
            try:
                os.unlink(temp_input)
            except:
                pass
        if temp_output and os.path.exists(temp_output):
            try:
                os.unlink(temp_output)
            except:
                pass


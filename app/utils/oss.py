"""
OSS云存储服务工具
"""
from typing import Optional
from app.core.config import settings

try:
    import oss2
    OSS2_AVAILABLE = True
except ImportError:
    OSS2_AVAILABLE = False

try:
    from PIL import Image
    import io
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


class OSSService:
    """OSS服务类"""
    
    def __init__(self):
        if not OSS2_AVAILABLE:
            self.bucket = None
            self.enabled = False
            return
        
        if all([
            settings.OSS_ACCESS_KEY_ID,
            settings.OSS_ACCESS_KEY_SECRET,
            settings.OSS_BUCKET_NAME,
            settings.OSS_ENDPOINT
        ]):
            auth = oss2.Auth(settings.OSS_ACCESS_KEY_ID, settings.OSS_ACCESS_KEY_SECRET)
            self.bucket = oss2.Bucket(auth, settings.OSS_ENDPOINT, settings.OSS_BUCKET_NAME)
            self.enabled = True
        else:
            self.bucket = None
            self.enabled = False
    
    def upload_file(
        self,
        file_content: bytes,
        file_path: str,
        content_type: Optional[str] = None
    ) -> Optional[str]:
        """
        上传文件到OSS
        
        OSS会自动创建文件夹结构，路径中的"/"会被识别为文件夹分隔符
        例如: images/2025/11/file.jpg 会自动创建 images/2025/11/ 文件夹结构
        
        Args:
            file_content: 文件内容（字节）
            file_path: OSS中的文件路径（支持多级路径，如 images/2025/11/file.jpg）
            content_type: 文件MIME类型
            
        Returns:
            文件URL，如果上传失败返回None
        """
        if not self.enabled:
            return None
        
        try:
            # 确保路径格式正确（去除开头的/，确保路径规范）
            file_path = file_path.lstrip('/')
            
            headers = {}
            if content_type:
                headers['Content-Type'] = content_type
            
            # OSS会自动创建路径中的文件夹结构，无需手动创建
            self.bucket.put_object(file_path, file_content, headers=headers)
            
            if settings.OSS_BASE_URL:
                return f"{settings.OSS_BASE_URL.rstrip('/')}/{file_path.lstrip('/')}"
            else:
                return f"https://{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}/{file_path.lstrip('/')}"
        except Exception as e:
            print(f"OSS上传失败: {e}")
            return None
    
    def extract_oss_path(self, url: str) -> Optional[str]:
        """
        从完整的URL中提取OSS对象路径
        """
        if not url:
            return None
        
        # 去除查询参数
        clean_url = url.split('?', 1)[0]
        
        # 优先处理自定义CDN域名
        if settings.OSS_BASE_URL and clean_url.startswith(settings.OSS_BASE_URL):
            path = clean_url[len(settings.OSS_BASE_URL):]
            return path.lstrip('/')
        
        # 处理默认OSS域名
        if self.enabled and settings.OSS_BUCKET_NAME and settings.OSS_ENDPOINT:
            default_domain = f"https://{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}/"
            if clean_url.startswith(default_domain):
                path = clean_url[len(default_domain):]
                return path.lstrip('/')
        
        # 解析URL获取路径
        from urllib.parse import urlparse
        parsed = urlparse(clean_url)
        if parsed.path:
            return parsed.path.lstrip('/')
        
        return None

    def upload_image(
        self,
        image_content: bytes,
        file_path: str,
        max_size: Optional[tuple] = None,
        quality: int = 85
    ) -> Optional[dict]:
        """
        上传图片到OSS，支持压缩和缩略图生成
        
        Args:
            image_content: 图片内容（字节）
            file_path: OSS中的文件路径
            max_size: 最大尺寸 (width, height)，None表示不限制
            quality: JPEG质量（1-100）
            
        Returns:
            包含原图和缩略图URL的字典，如果上传失败返回None
        """
        if not self.enabled:
            return None
        
        if not PIL_AVAILABLE:
            return None
        
        try:
            # 打开图片
            image = Image.open(io.BytesIO(image_content))
            original_format = image.format
            
            # 获取原始尺寸
            original_width, original_height = image.size
            
            # 如果需要压缩
            if max_size:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # 保存压缩后的图片
            output = io.BytesIO()
            if original_format == 'JPEG' or original_format == 'JPG':
                image.save(output, format='JPEG', quality=quality, optimize=True)
            elif original_format == 'PNG':
                image.save(output, format='PNG', optimize=True)
            else:
                # 转换为JPEG
                if image.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    if image.mode == 'P':
                        image = image.convert('RGBA')
                    background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                    image = background
                image.save(output, format='JPEG', quality=quality, optimize=True)
            
            compressed_content = output.getvalue()
            
            # 上传原图（或压缩后的图）
            image_url = self.upload_file(
                compressed_content,
                file_path,
                content_type=f"image/{original_format.lower() if original_format else 'jpeg'}"
            )
            
            if not image_url:
                return None
            
            result = {
                "url": image_url,
                "width": image.size[0],
                "height": image.size[1],
                "file_size": len(compressed_content)
            }
            
            # 生成高质量 WebP 缩略图
            thumbnail_size = (400, 400)
            thumbnail = image.copy()
            thumbnail.thumbnail(thumbnail_size, Image.Resampling.LANCZOS)
            
            # WebP 需要 RGB/RGBA 色彩空间
            if thumbnail.mode not in ("RGB", "RGBA"):
                thumbnail = thumbnail.convert("RGBA" if "A" in thumbnail.mode else "RGB")
            
            thumbnail_output = io.BytesIO()
            thumbnail.save(
                thumbnail_output,
                format='WEBP',
                quality=min(quality + 5, 95),
                method=6  # 更高压缩质量
            )
            thumbnail_content = thumbnail_output.getvalue()
            
            # 上传缩略图（使用 .webp 后缀）
            base_path = file_path.rsplit('.', 1)[0]
            thumbnail_path = f"{base_path}_thumb.webp"
            thumbnail_url = self.upload_file(
                thumbnail_content,
                thumbnail_path,
                content_type="image/webp"
            )
            
            if thumbnail_url:
                result["thumbnail_url"] = thumbnail_url
            
            return result
            
        except Exception as e:
            print(f"图片上传失败: {e}")
            return None
    
    def delete_file(self, file_path: str) -> bool:
        """
        删除OSS中的文件
        
        Args:
            file_path: OSS中的文件路径
            
        Returns:
            是否删除成功
        """
        if not self.enabled:
            return False
        
        try:
            self.bucket.delete_object(file_path)
            return True
        except Exception as e:
            print(f"OSS删除失败: {e}")
            return False


# 创建全局OSS服务实例
oss_service = OSSService()


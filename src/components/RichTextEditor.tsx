import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RichTextEditor({ value, onChange, placeholder, disabled }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const isInternalChange = useRef(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!quillRef.current) {
      const handleImageUpload = async (file: File) => {
        const quill = quillRef.current;
        if (!quill) return;

        // 포커스를 잃었을 경우를 대비해 현재 커서 위치를 가져오거나 맨 끝으로 설정
        const range = quill.getSelection() || { index: quill.getLength() };

        setIsUploading(true);

        try {
          // Firebase Storage에 업로드
          const fileExt = file.name.split('.').pop();
          const fileName = `post_images/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const storageRef = ref(storage, fileName);
          
          // 10초 타임아웃 설정 (Storage 미설정 시 무한 대기 방지)
          const uploadPromise = uploadBytes(storageRef, file);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('TIMEOUT')), 10000);
          });
          
          const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
          const downloadURL = await getDownloadURL(snapshot.ref);

          // 이미지 삽입
          quill.insertEmbed(range.index, 'image', downloadURL);
          quill.setSelection(range.index + 1, 0);
        } catch (error: any) {
          console.error('Error uploading image:', error);
          
          // Storage 업로드 실패 시 Base64로 폴백 (압축 적용)
          console.log('Falling back to Base64 image insertion...');
          try {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // 최대 너비/높이 제한 (1MB 제한 방지)
                const MAX_SIZE = 800;
                if (width > height && width > MAX_SIZE) {
                  height *= MAX_SIZE / width;
                  width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                  width *= MAX_SIZE / height;
                  height = MAX_SIZE;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // JPEG로 압축하여 Base64 생성
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                
                quill.insertEmbed(range.index, 'image', dataUrl);
                quill.setSelection(range.index + 1, 0);
              };
              img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
            
            if (error.message === 'TIMEOUT' || error?.code === 'storage/unauthorized' || error?.code === 'storage/unknown') {
              // Base64로 성공적으로 삽입되었음을 알림과 함께 경고
              alert('Firebase Storage가 설정되지 않아 이미지를 압축하여 본문에 직접 삽입했습니다.\n(고화질 원본 저장을 원하시면 Firebase Console에서 Storage를 활성화해주세요.)');
            }
          } catch (fallbackError) {
            alert(`이미지 업로드 실패: ${error.message || '알 수 없는 오류'}`);
          }
        } finally {
          setIsUploading(false);
        }
      };

      const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
          const file = input.files ? input.files[0] : null;
          if (!file) return;
          await handleImageUpload(file);
          input.value = ''; // 같은 파일 다시 선택 가능하도록 초기화
        };
      };

      quillRef.current = new Quill(containerRef.current, {
        theme: 'snow',
        placeholder: placeholder || '내용을 입력하세요...',
        readOnly: disabled,
        modules: {
          toolbar: {
            container: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              ['link', 'image'],
              ['clean']
            ],
            handlers: {
              image: imageHandler
            }
          }
        }
      });

      quillRef.current.on('text-change', () => {
        isInternalChange.current = true;
        const html = quillRef.current?.root.innerHTML || '';
        onChange(html === '<p><br></p>' ? '' : html);
        // Reset after a short delay to allow React to update
        setTimeout(() => {
          isInternalChange.current = false;
        }, 0);
      });

      // 드래그 앤 드롭 지원
      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };

      quillRef.current.root.addEventListener('dragover', handleDragOver, false);
      quillRef.current.root.addEventListener('dragenter', handleDragOver, false);

      quillRef.current.root.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
              await handleImageUpload(file);
            }
          }
        }
      }, false);

      // 붙여넣기 지원
      quillRef.current.root.addEventListener('paste', async (e) => {
        const clipboardData = e.clipboardData;
        if (clipboardData && clipboardData.items) {
          const items = clipboardData.items;
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              const file = items[i].getAsFile();
              if (file) {
                e.preventDefault();
                await handleImageUpload(file);
              }
            }
          }
        }
      }, false);
    }
  }, []); // Run once on mount

  useEffect(() => {
    if (quillRef.current && disabled !== undefined) {
      quillRef.current.enable(!disabled);
    }
  }, [disabled]);

  useEffect(() => {
    if (quillRef.current && !isInternalChange.current) {
      const currentHtml = quillRef.current.root.innerHTML;
      if (value !== currentHtml && value !== '<p><br></p>') {
        quillRef.current.root.innerHTML = value || '';
      }
    }
  }, [value]);

  return (
    <div className="relative bg-white border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow">
      {isUploading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-blue-600 bg-white p-4 rounded-lg shadow-lg border border-blue-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
            <span className="text-sm font-medium">이미지 업로드 중...</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className="min-h-[300px] border-none text-base" />
    </div>
  );
}

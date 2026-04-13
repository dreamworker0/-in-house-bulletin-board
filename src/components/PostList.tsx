import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Post } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';

export function PostList({ onSelectPost }: { onSelectPost: (post: Post) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(newPosts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-100">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">아직 게시글이 없습니다</h3>
        <p className="text-gray-500">팀원들과 첫 번째 소식을 공유해 보세요!</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
      <ul className="divide-y divide-gray-200">
        {posts.map((post) => (
          <li 
            key={post.id}
            onClick={() => onSelectPost(post)}
            className="hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="px-6 py-4 flex items-center justify-between gap-4">
              <h3 className="text-base font-medium text-gray-900 truncate flex-1">
                {post.title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-500 shrink-0">
                <span className="font-medium text-gray-700">{post.authorName}</span>
                <span>{post.createdAt?.toDate ? format(post.createdAt.toDate(), 'yyyy.MM.dd') : '방금 전'}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

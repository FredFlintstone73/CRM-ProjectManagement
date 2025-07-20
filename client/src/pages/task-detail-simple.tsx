import { useParams } from 'wouter';

interface TaskDetailParams {
  id: string;
}

export default function TaskDetailSimple() {
  alert('Simple TaskDetail is working!');
  console.log('Simple TaskDetail component loaded');
  
  const { id } = useParams<TaskDetailParams>();
  
  return (
    <div className="p-6">
      <h1>Task Detail - ID: {id}</h1>
      <p>This is a simple test component</p>
    </div>
  );
}
import fs from 'fs/promises';
import path from 'path';
import process from 'node:process';

class StorageService {
  constructor() {
    this.tasksDir = path.join(process.cwd(), 'tasks');
  }

  async ensureTasksDir() {
    try {
      await fs.mkdir(this.tasksDir, { recursive: true });
    } catch (error) {
      console.error('❌ Ошибка создания директории tasks:', error);
    }
  }

  getTasksFilePath(chatId) {
    return path.join(this.tasksDir, `chat_${chatId}_tasks.json`);
  }

  async saveTask(chatId, taskData) {
    try {
      await this.ensureTasksDir();
      const filePath = this.getTasksFilePath(chatId);

      let existingTasks = [];
      try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        existingTasks = JSON.parse(fileContent);
      } catch (error) {
        // Файл не существует, создаем новый
      }

      const newTask = {
        ...taskData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        chatId
      };

      existingTasks.push(newTask);
      await fs.writeFile(filePath, JSON.stringify(existingTasks, null, 2));

      return newTask.id;
    } catch (error) {
      console.error('❌ Ошибка сохранения задачи:', error);
      return null;
    }
  }

  async getTasks(chatId) {
    try {
      const filePath = this.getTasksFilePath(chatId);
      const fileContent = await fs.readFile(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      return [];
    }
  }

  async clearTasks(chatId) {
    try {
      const filePath = this.getTasksFilePath(chatId);
      await fs.writeFile(filePath, JSON.stringify([], null, 2));
      return true;
    } catch (error) {
      console.error('❌ Ошибка очистки задач:', error);
      return false;
    }
  }
}

export const storageService = new StorageService();

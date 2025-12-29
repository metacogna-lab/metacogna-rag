
import { LogEntry } from '../types';

class LogService {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private maxLogs = 500;

  constructor() {
    // Add some initial logs for demo
    this.add({ level: 'info', category: 'system', source: 'Boot', message: 'System initialized.' });
  }

  add(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    const newEntry: LogEntry = {
      ...entry,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    
    this.logs.unshift(newEntry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.notify();
  }

  getLogs() {
    return this.logs;
  }
  
  subscribe(fn: (logs: LogEntry[]) => void) {
    this.listeners.push(fn);
    // Send current state immediately
    fn(this.logs);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.logs));
  }
  
  clear() {
      this.logs = [];
      this.notify();
  }
}

export const systemLogs = new LogService();

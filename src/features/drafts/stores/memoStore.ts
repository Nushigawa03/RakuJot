import { makeAutoObservable } from 'mobx';

class MemoStore {
  memos = [];

  constructor() {
    makeAutoObservable(this);
  }

  addMemo(memo: string) {
    this.memos.push(memo);
  }

  getMemoList() {
    return this.memos;
  }
}

const memoStore = new MemoStore();
export default memoStore;
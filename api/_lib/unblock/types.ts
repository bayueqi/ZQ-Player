/** 解锁接口统一返回结构 */
export type SongUrlResult = {
  /** 状态码，200 表示取址成功 */
  code: number;
  /** 播放地址，失败时为 null */
  url: string | null;
};

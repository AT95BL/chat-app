package com.andrej.chat_app.dto;

import lombok.Data;
import java.util.List;

@Data
public class StatsDto {
    private double cpu;
    private RamDto ram;
    private NetworkDto network;
    private String os;
    private double timestamp;
    private List<ProcessDto> processes;

    @Data
    public static class RamDto {
        private long used_mb;
        private long total_mb;
        private double percent;
    }

    @Data
    public static class NetworkDto {
        private double rx_mb;
        private double tx_mb;
    }

    @Data
    public static class ProcessDto {
        private String pid;
        private String name;
        private String mem;
        private String cpu;
    }
}
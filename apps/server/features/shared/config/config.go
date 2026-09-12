package config

import "github.com/spf13/viper"

type Config struct {
	Port            int
	AllowedOrigins  []string
	DataDir         string
	JoinCode        string
	SessionTTLHours int
}

func Load() (*Config, error) {
	viper.SetDefault("port", 5001)
	viper.SetDefault("allowed_origins", []string{"*"})
	viper.SetDefault("data_dir", ".data")
	viper.SetDefault("join_code", "")
	viper.SetDefault("session_ttl_hours", 30)
	viper.AutomaticEnv()
	return &Config{
		Port:            viper.GetInt("port"),
		AllowedOrigins:  viper.GetStringSlice("allowed_origins"),
		DataDir:         viper.GetString("data_dir"),
		JoinCode:        viper.GetString("join_code"),
		SessionTTLHours: viper.GetInt("session_ttl_hours"),
	}, nil
}

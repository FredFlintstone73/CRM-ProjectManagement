import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Trophy, 
  Star, 
  Target, 
  Zap, 
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  Flame
} from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  total: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface UserLevel {
  level: number;
  xp: number;
  xpToNext: number;
  title: string;
}

interface GamificationSystemProps {
  completedTasks: number;
  totalTasks: number;
  streak: number;
  todayCompleted: number;
  weekCompleted: number;
  onLevelUp?: (newLevel: number) => void;
}

export function GamificationSystem({ 
  completedTasks, 
  totalTasks, 
  streak, 
  todayCompleted, 
  weekCompleted,
  onLevelUp 
}: GamificationSystemProps) {
  const [currentLevel, setCurrentLevel] = useState<UserLevel>({
    level: 1,
    xp: 0,
    xpToNext: 100,
    title: "Task Novice"
  });

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: 'first_task',
      title: 'First Steps',
      description: 'Complete your first task',
      icon: <CheckCircle2 className="h-4 w-4" />,
      unlocked: false,
      progress: 0,
      total: 1,
      rarity: 'common'
    },
    {
      id: 'streak_3',
      title: 'Getting Started',
      description: 'Maintain a 3-day streak',
      icon: <Flame className="h-4 w-4" />,
      unlocked: false,
      progress: 0,
      total: 3,
      rarity: 'common'
    },
    {
      id: 'streak_7',
      title: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: <Flame className="h-4 w-4" />,
      unlocked: false,
      progress: 0,
      total: 7,
      rarity: 'rare'
    },
    {
      id: 'daily_5',
      title: 'Daily Dynamo',
      description: 'Complete 5 tasks in one day',
      icon: <Target className="h-4 w-4" />,
      unlocked: false,
      progress: 0,
      total: 5,
      rarity: 'rare'
    },
    {
      id: 'weekly_20',
      title: 'Weekly Wonder',
      description: 'Complete 20 tasks in one week',
      icon: <Award className="h-4 w-4" />,
      unlocked: false,
      progress: 0,
      total: 20,
      rarity: 'epic'
    },
    {
      id: 'completionist',
      title: 'Completionist',
      description: 'Complete 100 tasks total',
      icon: <Trophy className="h-4 w-4" />,
      unlocked: false,
      progress: 0,
      total: 100,
      rarity: 'legendary'
    }
  ]);

  // Calculate level based on total XP
  const calculateLevel = (totalXP: number): UserLevel => {
    let level = 1;
    let xpRequired = 100;
    let totalRequired = 0;

    while (totalXP >= totalRequired + xpRequired) {
      totalRequired += xpRequired;
      level++;
      xpRequired = Math.floor(xpRequired * 1.2); // Increase XP requirement by 20% each level
    }

    const titles = [
      "Task Novice",
      "Task Apprentice", 
      "Task Journeyman",
      "Task Expert",
      "Task Master",
      "Task Virtuoso",
      "Task Legend"
    ];

    return {
      level,
      xp: totalXP - totalRequired,
      xpToNext: xpRequired,
      title: titles[Math.min(level - 1, titles.length - 1)]
    };
  };

  // Calculate XP based on achievements and tasks
  const calculateXP = () => {
    let totalXP = 0;
    
    // Base XP from completed tasks
    totalXP += completedTasks * 10;
    
    // Bonus XP from streaks
    if (streak >= 3) totalXP += 50;
    if (streak >= 7) totalXP += 100;
    if (streak >= 14) totalXP += 200;
    
    // Bonus XP from daily completions
    if (todayCompleted >= 5) totalXP += 100;
    if (todayCompleted >= 10) totalXP += 200;
    
    // Bonus XP from weekly completions
    if (weekCompleted >= 20) totalXP += 300;
    
    return totalXP;
  };

  // Update achievements based on current stats
  const updateAchievements = () => {
    setAchievements(prevAchievements => 
      prevAchievements.map(achievement => {
        let progress = 0;
        let unlocked = false;

        switch (achievement.id) {
          case 'first_task':
            progress = Math.min(completedTasks, 1);
            unlocked = completedTasks >= 1;
            break;
          case 'streak_3':
            progress = Math.min(streak, 3);
            unlocked = streak >= 3;
            break;
          case 'streak_7':
            progress = Math.min(streak, 7);
            unlocked = streak >= 7;
            break;
          case 'daily_5':
            progress = Math.min(todayCompleted, 5);
            unlocked = todayCompleted >= 5;
            break;
          case 'weekly_20':
            progress = Math.min(weekCompleted, 20);
            unlocked = weekCompleted >= 20;
            break;
          case 'completionist':
            progress = Math.min(completedTasks, 100);
            unlocked = completedTasks >= 100;
            break;
        }

        return {
          ...achievement,
          progress,
          unlocked
        };
      })
    );
  };

  // Update level and achievements when stats change
  useEffect(() => {
    const totalXP = calculateXP();
    const newLevel = calculateLevel(totalXP);
    
    if (newLevel.level > currentLevel.level) {
      onLevelUp?.(newLevel.level);
    }
    
    setCurrentLevel(newLevel);
    updateAchievements();
  }, [completedTasks, streak, todayCompleted, weekCompleted]);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
      case 'rare': return 'text-blue-600 bg-blue-100 dark:bg-blue-900';
      case 'epic': return 'text-purple-600 bg-purple-100 dark:bg-purple-900';
      case 'legendary': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const nearestAchievement = achievements
    .filter(a => !a.unlocked)
    .sort((a, b) => (b.progress / b.total) - (a.progress / a.total))[0];

  return (
    <div className="space-y-4">
      {/* Level Display */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                {currentLevel.level}
              </div>
              <div>
                <div className="font-semibold">{currentLevel.title}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Level {currentLevel.level}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {currentLevel.xp} / {currentLevel.xpToNext} XP
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                to next level
              </div>
            </div>
          </div>
          <Progress 
            value={(currentLevel.xp / currentLevel.xpToNext) * 100} 
            className="h-2"
          />
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      {unlockedAchievements.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Recent Achievements
            </h3>
            <div className="space-y-2">
              {unlockedAchievements.slice(-3).map((achievement) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className={`p-2 rounded-full ${getRarityColor(achievement.rarity)}`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{achievement.title}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {achievement.description}
                    </div>
                  </div>
                  <Badge variant="outline" className={getRarityColor(achievement.rarity)}>
                    {achievement.rarity}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Achievement */}
      {nearestAchievement && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Next Achievement
            </h3>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className={`p-2 rounded-full ${getRarityColor(nearestAchievement.rarity)}`}>
                {nearestAchievement.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{nearestAchievement.title}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {nearestAchievement.description}
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(nearestAchievement.progress / nearestAchievement.total) * 100} 
                    className="h-1 flex-1"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {nearestAchievement.progress}/{nearestAchievement.total}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}